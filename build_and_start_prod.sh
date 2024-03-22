#!/bin/bash
docker kill sequence_flow_current_version || true
docker rm sequence_flow_current_version || true
docker build -t sequence-flow ./
docker run -p 5000:5000 -d --name sequence_flow_current_version --restart always sequence-flow