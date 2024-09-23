# Sequence Flow

Sequence Flow is a small web application that allows you to easily visualize Multiple Sequence Alignments with an innovative approach - using Sankey diagrams.  
The production version is available at <https://sequenceflow.mimuw.edu.pl/>.  

## How to start locally

__(Should be used with Python 3.11)__  
In order to start the application:

1. Download the repository
2. It's recommended to create a virtual Python environment and activate it
3. Install the packages from the `requirements.txt` file and run the application with the following commands:

```bash
pip install -r requirements.txt
python3 app.py
```

## Local development

To make the development easier, it's recommended to change the `debug` setting in the `app.py` file to `True`.  
This way, after saving the changes, you only need to refresh the page to see them.  

Any change made to the JavaScript files requires bundling. To do so, you need to have Node.js and NPM installed. In the `/static/scripts` directory, install the necessary dependencies:

```sh
npm i
```

And upon changes run:

```bash
npm run build
```

## Docker flow

In order to deploy (or run) the application using Docker, you can use the `build_and_start_prod.sh` script, or run the following commands:  

```bash
docker kill sequence_flow_current_version || true
docker rm sequence_flow_current_version || true
docker build -t sequence-flow ./
docker run -p 5000:5000 -d --name sequence_flow_current_version --restart always sequence-flow
```
