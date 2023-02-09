package server

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"cdr.dev/slog/sloggers/slogtest"
	"cloud.google.com/go/storage"
	"go.coder.com/hat"
	"go.coder.com/hat/asshat"
	"google.golang.org/api/option"
)

func Test_randNoteChar(t *testing.T) {
	t.Logf("do these look random to you?")
	for i := 0; i < 5; i++ {
		t.Logf("%c", randNoteChar())
	}
}

func jsonBody(v interface{}) hat.RequestOption {
	return func(t testing.TB, req *http.Request) {
		byt, err := json.Marshal(v)
		if err != nil {
			panic(err)
		}
		req.Body = io.NopCloser(bytes.NewReader(byt))
	}
}

func TestServer(t *testing.T) {
	t.Parallel()
	ctx := context.Background()

	storageClient, err := storage.NewClient(ctx, option.WithScopes(storage.ScopeFullControl))
	if err != nil {
		panic(err)
	}

	s := Server{
		Log:     slogtest.Make(t, nil),
		Storage: storageClient,
	}

	hs := httptest.NewServer(s.Handler())
	t.Cleanup(hs.Close)

	ht := hat.New(t, hs.URL)
	// Happiest path, a bunch of notes are created!
	for i := 0; i < 5; i++ {
		contents := fmt.Sprintf("testing-%v", i)
		body := jsonBody(note{
			Contents:         contents,
			ExpiresAt:        time.Now().Add(time.Second * 10),
			DestroyAfterRead: true,
		})
		resp := ht.Post(hat.Path("/api/notes"), body).Send(ht)
		objectName := string(resp.DuplicateBody(t))
		t.Logf("body: %+v", objectName)
		resp.Assert(t, asshat.StatusEqual(http.StatusCreated))
		ht.Get(hat.Path("/api/notes/"+objectName)).Send(ht).Assert(t, asshat.BodyMatches(contents))
	}

	// Cannot read expired note.
	ht.Post(hat.Path("/api/notes"), jsonBody(note{
		Contents:  "doesn't matter",
		ExpiresAt: time.Now(),
	})).Send(ht).Assert(t, asshat.StatusEqual(http.StatusCreated))

	// Can read Destroy after Read note... once
	ht.Post(hat.Path("/api/notes"), jsonBody(note{
		Contents:  "doesn't matter",
		ExpiresAt: time.Now(),
	})).Send(ht).Assert(t, asshat.StatusEqual(http.StatusCreated))
}
