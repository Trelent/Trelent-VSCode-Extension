#! /bin/bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "${SCRIPT_DIR}"

declare -a buildpaths=("/react-help-app")

for val in ${buildpaths[@]}; do
    cd "${SCRIPT_DIR}${val}"
    yarn build &
    wait
    cd "${SCRIPT_DIR}"
done
yarn build