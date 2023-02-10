FROM alpine
ADD bin/scr /bin/scr
ENTRYPOINT [ "scr" ]