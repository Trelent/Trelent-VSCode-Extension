#! /bin/bash

# Install dependencies and build our project
./installDependencies.sh
./buildAll.sh

# Publish the extension. By default, VSCE will use the $VSCE_PAT
# env var as the publisher token. 
yarn run vsce publish --yarn