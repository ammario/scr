package server

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"math/rand"
	"net/http"
	"time"

	"cdr.dev/slog"
	"cloud.google.com/go/storage"
	"github.com/go-chi/chi/v5"
)

type Server struct {
	Log     slog.Logger
	Storage *storage.Client
}

//go:embed dist/**
var statisFS embed.FS

const maxNoteSize = 100 << 20

func (s *Server) Handler() http.Handler {
	subfs, err := fs.Sub(statisFS, "dist")
	if err != nil {
		panic(err)
	}

	r := chi.NewRouter()
	r.Use(func(h http.Handler) http.Handler {
		return http.MaxBytesHandler(h, maxNoteSize*2)
	})
	r.Handle("/*", http.FileServer(http.FS(subfs)))

	return r
}

type noteRequest struct {
	Contents         []byte `json:"contents,omitempty"`
	TTL              int    `json:"ttl,omitempty"`
	DestroyAfterRead bool   `json:"destroy_after_read,omitempty"`
}

func writeError(w http.ResponseWriter, statusCode int, message string, as ...interface{}) {
	w.WriteHeader(statusCode)
	fmt.Fprintf(w, message, as...)
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
		name += string(randNoteChar())
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

func (s *Server) postNote(w http.ResponseWriter, r *http.Request) {
	var parsedReq noteRequest

	err := json.NewDecoder(r.Body).Decode(&parsedReq)
	if err != nil {
		writeError(w, http.StatusBadRequest, "parse JSON: %v", err)
		return
	}
	if len(parsedReq.Contents) > maxNoteSize {
		writeError(w, http.StatusBadRequest, "Contents exceed max note size of %v bytes", maxNoteSize)
		return
	}
}
