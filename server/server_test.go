package server

import "testing"

func Test_randNoteChar(t *testing.T) {
	t.Logf("do these look random to you?")
	for i := 0; i < 5; i++ {
		t.Logf("%c", randNoteChar())
	}
}
