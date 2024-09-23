from flask import Flask, jsonify, render_template, request
import os
import random
import string
from Bio import AlignIO
import json

app = Flask(__name__)

# app configuration
app.config.update(
    dict(
        MAX_CONTENT_LENGHT=1024 * 1024 * 10,  # 10 Mb
        UPLOAD_FOLDER="temporary_files",
    )
)
ALLOWED_EXTENSIONS = {
    "msf": "msf",
    "fasta": "fasta",
    "fna": "fasta",
    "ffn": "fasta",
    "frn": "fasta",
    "fa": "fasta",
    "faa": "fasta",
    "fas": "fasta",
    "clustal": "clustal",
    "aln": "clustal",
    "phy": "phylip",
    "phylip": "phylip",
    "stk": "stockholm",
    "sth": "stockholm",
    "sto": "stockholm",
    "stockholm": "stockholm",
}


def check_file_extension(filename):
    extension = filename.rsplit(".", 1)[1].lower()
    return (
        "." in filename and extension in ALLOWED_EXTENSIONS.keys(),
        ALLOWED_EXTENSIONS.get(extension, None),
    )


def read_sequences(path, seq_format):
    alignment = AlignIO.read(path, seq_format)
    return {str(record.id): str(record.seq) for record in alignment}


#########  REST API


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/upload_sequences", methods=["PUT"])
def return_parsed_sequences():
    file = request.files["alignment_file"]
    file_extension = check_file_extension(file.filename)
    # save file in a safe namespace
    filepath = os.path.join(
        app.config["UPLOAD_FOLDER"],
        f"{''.join(random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(20))}.{file_extension[1]}",
    )
    file.save(filepath)
    file.close()
    valid = True
    sequences = None
    error = ''
    try:
        sequences = read_sequences(filepath, file_extension[1])
    except Exception as e:
        valid = False
        error = str(e)
    os.remove(filepath)

    return (jsonify(sequences), 200) if valid else (f"Invalid file: {error}", 500)


@app.route("/get_example/<dataset_name>", methods=["GET"])
def return_example_data(dataset_name: string):
    dataset_path = os.path.join("static", "example_datasets", f"{dataset_name}.json")
    dataset = None
    try:
        with open(dataset_path, "r", encoding="UTF-8") as dataset_path:
            dataset = json.loads(dataset_path.read())
    except:
        return "Invalid example dataset", 500

    return jsonify(dataset), 200


if __name__ == "__main__":
    app.run(
        debug=False,
        threaded=True,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
    )
