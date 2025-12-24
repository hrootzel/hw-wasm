FROM debian:trixie

ENV DEBIAN_FRONTEND=noninteractive

RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y wine32 wine64 wget xvfb 7zip xz-utils unzip

RUN xvfb-run --auto-servernum wineboot --init

# Prepare build environment for Qt
WORKDIR /

RUN wget --no-verbose \
        https://github.com/clamwin/openssl/archive/refs/heads/master.zip \
        https://github.com/ninja-build/ninja/releases/download/v1.13.2/ninja-win.zip \
        https://github.com/skeeto/w64devkit/releases/download/v2.5.0/w64devkit-x64-2.5.0.7z.exe \
        https://github.com/Kitware/CMake/releases/download/v4.2.1/cmake-4.2.1-windows-x86_64.zip \
        https://download.qt.io/development_releases/prebuilt/libclang/libclang-release_21.1.2-based-windows-mingw_64.7z
        
RUN mkdir ninja && cd ninja && unzip ../ninja-win.zip && rm ../ninja-win.zip

RUN find *.zip -print -exec unzip -q {} \; -delete && 7z x *.exe && rm *.exe && 7z x *.7z && rm *.7z && mv -v openssl-master/lib/mingw/x64/*.a openssl-master/lib

# Prepare static Qt build
WORKDIR /Qt

COPY ./build-qt.cmd .

RUN wget -qO- https://download.qt.io/official_releases/qt/6.10/6.10.1/single/qt-everywhere-src-6.10.1.tar.xz | tar xJ

RUN ls . ..
RUN xvfb-run --auto-servernum wine cmd /c build-qt.cmd
RUN rm -rf qt-everywhere-src-6.10.1.tar.xz

# Prepare other dependencies for Hedgewars
RUN wget --no-verbose https://sourceforge.net/projects/nsis/files/NSIS%25203/3.11/nsis-3.11-setup.exe/download -O nsis_setup.exe \
        http://downloads.freepascal.org/fpc/dist/3.2.2/i386-win32/fpc-3.2.2.i386-win32.exe \
        http://downloads.freepascal.org/fpc/dist/3.2.2/i386-win32/fpc-3.2.2.i386-win32.cross.x86_64-win64.exe \
        https://win.rustup.rs/x86_64 -O rustup-init.exe
        
RUN rustup-init.exe -y && rm rustup-init.exe

RUN xvfb-run --auto-servernum wine nsis_setup.exe /S && rm nsis_setup.exe
    
    
# Build Hedgewars
COPY ./build-hedgewars.cmd .

RUN echo 'Xvfb :0 -screen 0 1024x768x16 & wine cmd /c "$@"' > /usr/bin/winrun && \
    chmod +x /usr/bin/winrun

WORKDIR /build

ENTRYPOINT ["/usr/bin/winrun"]

