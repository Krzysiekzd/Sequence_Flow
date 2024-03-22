FROM python:3.11

WORKDIR /usr/src/app

COPY . .

RUN pip install -r requirements.txt

EXPOSE 5000
ENTRYPOINT [ "python3" ]
CMD ["app.py" ]