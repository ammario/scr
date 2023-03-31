package server

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"cdr.dev/slog"
	"cloud.google.com/go/storage"
	"github.com/go-chi/chi/v5"
	"google.golang.org/api/googleapi"
)

type Server struct {
	Log     slog.Logger
	Storage *storage.Client
}

//go:embed all:dist/**
var staticFS embed.FS

const maxNoteSize = 100 << 20

func (s *Server) Handler() http.Handler {
	subfs, err := fs.Sub(staticFS, "dist")
	if err != nil {
		panic(err)
	}

	r := chi.NewRouter()
	r.Use(func(h http.Handler) http.Handler {
		return http.MaxBytesHandler(h, maxNoteSize*2)
	})

	fileServer := http.FileServer(http.FS(subfs))
	// r.Handle("/*", fileServer)

	// Oh man is this janky.
	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/about":
			r.URL.Path = "/about.html"
		case len(r.URL.Path) > 1 && strings.Count(r.URL.Path, "/") == 1 && !strings.Contains(r.URL.Path, "."):
			// Redirect "view" directives to the index.html.
			w.Header().Set("Redirected-From", r.URL.Path)
			r.URL.Path = "[...path].html"
		}
		fileServer.ServeHTTP(w, r)
	})

	r.Route("/api", func(r chi.Router) {
		r.Post("/notes", s.postNote)
		r.Get("/notes/{id}", s.getNote)
	})

	return r
}

type note struct {
	Contents         string    `json:"contents,omitempty"`
	ExpiresAt        time.Time `json:"expires_at,omitempty"`
	DestroyAfterRead bool      `json:"destroy_after_read,omitempty"`
}

func writePlainText(w http.ResponseWriter, statusCode int, message string, as ...interface{}) {
	w.WriteHeader(statusCode)
	w.Header().Set("Content-Type", "text/plain")
	fmt.Fprintf(w, message, as...)
}

func writeJSON(w http.ResponseWriter, statusCode int, message interface{}) {
	w.WriteHeader(statusCode)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(message)
}

const bucketName = "scr-notes"

const noteNameCharset = "abcdefghijklmnopqrstuvwxyz0123456789"

func init() {
	rand.Seed(time.Now().UnixNano())
}

func randNoteChar() byte {
	return noteNameCharset[rand.Intn(len(noteNameCharset))]
}

// findObjectID finds a short ID to use for a new object note.
// It's OK if there is a conflict due to parallel upload, that's why
// we use an If condition.
func (s *Server) findObjectID(ctx context.Context) (string, error) {
	bucket := s.Storage.Bucket(bucketName)

	var name string
	for {
		// Minimum name of 4 characters
		name += string(randNoteChar())
		if len(name) < 4 {
			continue
		}

		obj := bucket.Object(name)
		_, err := obj.Attrs(ctx)
		if err != nil {
			if err == storage.ErrObjectNotExist {
				return name, nil
			}
			return "", err
		}
	}
}

func (s *Server) getNote(w http.ResponseWriter, r *http.Request) {
	objectID := chi.URLParam(r, "id")

	w.Header().Set("Cache-Control", "no-cache")

	reader, err := s.Storage.Bucket(bucketName).Object(objectID).NewReader(r.Context())
	if err != nil {
		if err == storage.ErrObjectNotExist {
			writePlainText(w, http.StatusNotFound, "Object doesn't exist")
			return
		}
		writePlainText(w, http.StatusInternalServerError, "Something ain't right")
		return
	}
	defer reader.Close()

	var n note
	err = json.NewDecoder(reader).Decode(&n)
	if err != nil {
		writePlainText(w, http.StatusInternalServerError, "note corrupt: %v", err)
		return
	}

	// When peek is set, we don't return the contents but we let the viewer
	// check the metadata. This is useful for prompting an "are you sure you want
	// to see the note?"
	if r.URL.Query().Has("peek") && n.DestroyAfterRead {
		n.Contents = ""
		writeJSON(w, http.StatusOK, n)
		return
	}

	isExpired := n.ExpiresAt.Before(time.Now())
	if n.DestroyAfterRead || isExpired {
		err = s.Storage.Bucket(bucketName).Object(objectID).Delete(context.Background())
		if err != nil {
			s.Log.Error(
				r.Context(), "destroy note",
				slog.F("id", objectID), slog.Error(err),
			)
			if err == storage.ErrObjectNotExist {
				// I'm not sure why this happens, but it does, and the object
				// is always actually still deleted. Let's just 404.
				writePlainText(w, http.StatusNotFound, "note not found")
				return
			}
		}
	}

	if isExpired {
		// sshhh
		writePlainText(w, http.StatusNotFound, "note not found")
		return
	}

	writeJSON(w, http.StatusOK, n)
}

func (s *Server) postNote(w http.ResponseWriter, r *http.Request) {
	var parsedReq note

	err := json.NewDecoder(r.Body).Decode(&parsedReq)
	if err != nil {
		writePlainText(w, http.StatusBadRequest, "parse JSON: %v", err)
		return
	}
	if len(parsedReq.Contents) > maxNoteSize {
		writePlainText(w, http.StatusBadRequest, "Contents exceed max note size of %v bytes", maxNoteSize)
		return
	}
	if parsedReq.ExpiresAt.After(time.Now().AddDate(0, 0, 30)) {
		writePlainText(w, http.StatusBadRequest, "Note expires too far into the future")
		return
	}

	for attempts := 0; attempts < 10; attempts++ {
		objectName, err := s.findObjectID(r.Context())
		if err != nil {
			writePlainText(w, http.StatusInternalServerError, "An internal error occured")
			s.Log.Error(r.Context(), "find object id", slog.Error(err))
			return
		}

		objectHandle := s.Storage.Bucket(bucketName).Object(objectName).If(storage.Conditions{
			// Very important!
			// Conflicts are common and possible due to our ID generation logic.
			DoesNotExist: true,
		})

		hw := objectHandle.NewWriter(r.Context())
		json.NewEncoder(hw).Encode(parsedReq)
		err = hw.Close()
		if err != nil {
			if e, ok := err.(*googleapi.Error); ok {
				// There was a race condition for the object name.
				if e.Code == http.StatusPreconditionFailed {
					hw.Close()
					continue
				}
			}
			writePlainText(w, http.StatusInternalServerError, "failed to write")
			s.Log.Error(r.Context(), "write to storage", slog.Error(err))
			return
		}
		writePlainText(w, http.StatusCreated, objectName)
		return
	}

	writePlainText(w, http.StatusInternalServerError, "An internal error occured")
	s.Log.Error(r.Context(), "could not allocate object id in time")
}
