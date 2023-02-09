package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strconv"

	"cdr.dev/slog"
	"cdr.dev/slog/sloggers/sloghuman"
	"cloud.google.com/go/storage"
	"github.com/ammario/scr/server"
	"github.com/spf13/cobra"
)

func main() {
	var (
		port    uint16
		project string
		dataset string
	)

	log := slog.Make(sloghuman.Sink(os.Stderr))

	cmd := &cobra.Command{
		Use:   "scr",
		Short: "",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := context.Background()

			client, err := storage.NewClient(ctx)
			if err != nil {
				panic(err)
			}

			s := server.Server{
				Log:     log,
				Storage: client,
			}
			h := s.Handler()
			log.Info(ctx, "starting server", slog.F("port", port))
			return http.ListenAndServe(":"+strconv.Itoa(int(port)), h)
		},
	}
	cmd.Flags().StringVarP(&project, "project", "", "scr-send", "Customize the Google Cloud project the hosts the .")
	cmd.Flags().StringVarP(&dataset, "dataset", "", "coder", "Customize the dataset to store BigQuery data.")
	defaultPort, err := strconv.Atoi(os.Getenv("PORT"))
	if err != nil {
		defaultPort = 3000
	}
	cmd.Flags().Uint16VarP(&port, "port", "p", uint16(defaultPort), "Customize the port for the server to listen on.")
	err = cmd.Execute()
	if err != nil {
		fmt.Println(err.Error())
		os.Exit(1)
	}
}
