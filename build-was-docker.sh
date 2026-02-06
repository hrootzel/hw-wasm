#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="${IMAGE_NAME:-hw-wasm-builder:latest}"
DOCKERFILE_PATH="${DOCKERFILE_PATH:-${ROOT_DIR}/Dockerfile.wasm}"
BUILD_DIR="${BUILD_DIR:-build/wasm}"
BUILD_TYPE="${BUILD_TYPE:-Release}"
JOBS="${JOBS:-$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 4)}"
STAGE_DATA="${STAGE_DATA:-1}"
SKIP_RUST="${SKIP_RUST:-OFF}"
SKIP_PAS2C="${SKIP_PAS2C:-OFF}"
WASM_DEBUG="${WASM_DEBUG:-OFF}"
CLEAN="${CLEAN:-0}"

mkdir -p "${ROOT_DIR}/build"

docker build -f "${DOCKERFILE_PATH}" -t "${IMAGE_NAME}" "${ROOT_DIR}"

docker run --rm -t \
  -v "${ROOT_DIR}:/workspace" \
  -v "${ROOT_DIR}/build:/workspace/build" \
  -e BUILD_DIR="${BUILD_DIR}" \
  -e BUILD_TYPE="${BUILD_TYPE}" \
  -e JOBS="${JOBS}" \
  -e STAGE_DATA="${STAGE_DATA}" \
  -e SKIP_RUST="${SKIP_RUST}" \
  -e SKIP_PAS2C="${SKIP_PAS2C}" \
  -e WASM_DEBUG="${WASM_DEBUG}" \
  -e CLEAN="${CLEAN}" \
  "${IMAGE_NAME}" \
  bash -lc '
    set -euo pipefail
    source /opt/emsdk/emsdk_env.sh >/dev/null

    build_dir="${BUILD_DIR:-build/wasm}"
    build_type="${BUILD_TYPE:-Release}"
    jobs="${JOBS:-4}"
    stage_data="${STAGE_DATA:-1}"
    skip_rust="${SKIP_RUST:-OFF}"
    skip_pas2c="${SKIP_PAS2C:-OFF}"
    wasm_debug="${WASM_DEBUG:-OFF}"

    if [[ "${CLEAN:-0}" == "1" ]]; then
      rm -rf "${build_dir}"
    fi

    mkdir -p "${build_dir}"
    build_dir_full="$(cd "${build_dir}" && pwd)"

    # If this build dir was configured on the host (for example Windows paths),
    # CMake will reject it in the container. Drop stale cache metadata only.
    cache_file="${build_dir_full}/CMakeCache.txt"
    if [[ -f "${cache_file}" ]]; then
      if grep -Eq "C:/|[A-Za-z]:\\\\\\\\|C:\\\\Users\\\\" "${cache_file}"; then
        echo "Detected host-generated CMake cache. Cleaning stale CMake metadata..."
        rm -f "${build_dir_full}/CMakeCache.txt"
        rm -rf "${build_dir_full}/CMakeFiles"
      fi
    fi

    cat > "${build_dir_full}/SDL2Config.cmake" <<'\''EOF'\''
set(SDL2_INCLUDE_DIRS "${CMAKE_SYSTEM_INCLUDE_PATH}/SDL")
set(SDL2_LIBRARIES "")
if(NOT TARGET SDL2::SDL2)
  add_library(SDL2::SDL2 INTERFACE IMPORTED)
  set_target_properties(SDL2::SDL2 PROPERTIES
    INTERFACE_INCLUDE_DIRECTORIES "${SDL2_INCLUDE_DIRS}"
    INTERFACE_LINK_LIBRARIES "${SDL2_LIBRARIES}")
endif()
set(SDL2_FOUND TRUE)
EOF

    cat > "${build_dir_full}/SDL2_mixerConfig.cmake" <<'\''EOF'\''
set(SDL2_MIXER_LIBRARY "")
set(SDL2_MIXER_LIBRARIES "")
if(NOT TARGET SDL2_mixer::SDL2_mixer)
  add_library(SDL2_mixer::SDL2_mixer INTERFACE IMPORTED)
  set_target_properties(SDL2_mixer::SDL2_mixer PROPERTIES
    INTERFACE_INCLUDE_DIRECTORIES "${CMAKE_SYSTEM_INCLUDE_PATH}/SDL")
endif()
set(SDL2_mixer_FOUND TRUE)
EOF

    cat > "${build_dir_full}/SDL2_netConfig.cmake" <<'\''EOF'\''
set(SDL2_NET_LIBRARIES "")
if(NOT TARGET SDL2_net::SDL2_net)
  add_library(SDL2_net::SDL2_net INTERFACE IMPORTED)
  set_target_properties(SDL2_net::SDL2_net PROPERTIES
    INTERFACE_INCLUDE_DIRECTORIES "${CMAKE_SYSTEM_INCLUDE_PATH}/SDL")
endif()
set(SDL2_net_FOUND TRUE)
EOF

    cat > "${build_dir_full}/SDL2_imageConfig.cmake" <<'\''EOF'\''
set(SDL2_IMAGE_LIBRARIES "")
if(NOT TARGET SDL2_image::SDL2_image)
  add_library(SDL2_image::SDL2_image INTERFACE IMPORTED)
  set_target_properties(SDL2_image::SDL2_image PROPERTIES
    INTERFACE_INCLUDE_DIRECTORIES "${CMAKE_SYSTEM_INCLUDE_PATH}/SDL")
endif()
set(SDL2_image_FOUND TRUE)
EOF

    cat > "${build_dir_full}/SDL2_ttfConfig.cmake" <<'\''EOF'\''
set(SDL2_TTF_LIBRARIES "")
if(NOT TARGET SDL2_ttf::SDL2_ttf)
  add_library(SDL2_ttf::SDL2_ttf INTERFACE IMPORTED)
  set_target_properties(SDL2_ttf::SDL2_ttf PROPERTIES
    INTERFACE_INCLUDE_DIRECTORIES "${CMAKE_SYSTEM_INCLUDE_PATH}/SDL")
endif()
set(SDL2_ttf_FOUND TRUE)
EOF

    physfs_src="misc/libphysfs"
    physfs_out="${build_dir_full}/physfs"
    mkdir -p "${physfs_out}"
    find "${physfs_out}" -type f -name "*.o" -delete

    while IFS= read -r src; do
      out_obj="${physfs_out}/$(basename "${src}").o"
      emcc -O2 -c "${src}" -I"${physfs_src}" -DPHYSFS_NO_CDROM_SUPPORT=1 -D__unix__=1 -o "${out_obj}"
    done < <(
      find "${physfs_src}" -type f -name "*.c" \
        ! -name "platform_windows.c" \
        ! -name "platform_winrt.cpp" \
        ! -name "platform_macosx.c" \
        ! -name "platform_beos.cpp" \
        ! -name "archiver_lzma.c" \
        ! -path "*/lzma/*" \
        | sort
    )

    physfs_lib="${physfs_out}/libphysfs2.a"
    rm -f "${physfs_lib}"
    emar rcs "${physfs_lib}" "${physfs_out}"/*.o

    emcmake cmake \
      -S . \
      -B "${build_dir_full}" \
      -G Ninja \
      -DCMAKE_BUILD_TYPE="${build_type}" \
      -DBUILD_ENGINE_C=1 \
      -DBUILD_ENGINE_JS=ON \
      -DNOSERVER=ON \
      -DLUA_SYSTEM=OFF \
      -DNOVIDEOREC=1 \
      -DSKIP_RUST="${skip_rust}" \
      -DSKIP_PAS2C="${skip_pas2c}" \
      -DPHYSFS_LIBRARY="${physfs_lib}" \
      -DPHYSFS_INCLUDE_DIR="$(cd "${physfs_src}" && pwd)" \
      -DSDL2_DIR="${build_dir_full}" \
      -DCMAKE_PREFIX_PATH="${build_dir_full}" \
      -DCARGO_FLAGS=--target=wasm32-unknown-emscripten \
      -DHW_WASM_DEBUG="${wasm_debug}"

    emmake cmake --build "${build_dir_full}" -j"${jobs}"

    if [[ "${stage_data}" == "1" ]]; then
      bin_dir="${build_dir_full}/bin"
      mkdir -p "${bin_dir}"
      rm -rf "${bin_dir}/Data" "${bin_dir}/web-frontend"
      cp -a "share/hedgewars/Data" "${bin_dir}/Data"
      cp -a "web-frontend" "${bin_dir}/web-frontend"
      if [[ -f "index.html" ]]; then
        cp "index.html" "${bin_dir}/index.html"
      fi
    fi

    if [[ ! -f "${build_dir_full}/bin/hwengine.html" ]]; then
      echo "Expected output missing: ${build_dir_full}/bin/hwengine.html" >&2
      exit 1
    fi

    echo
    echo "Build complete."
    echo "Output: ${build_dir_full}/bin"
  '
