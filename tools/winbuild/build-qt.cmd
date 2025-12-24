@echo off
setlocal

cd Build

:: ============================================================
:: 1. USER CONFIGURATION (EDIT THESE PATHS)
:: ============================================================

:: Path to the unpacked Qt Source Code (e.g., qt-everywhere-src-6.10.1)
set "QT_SRC=Z:/Qt/qt-everywhere-src-6.10.1"

:: Path to Qt installation folder
set "QT_INSTALL_DIR=Z:/Qt/6.10.1"

:: Path to your MinGW OpenSSL installation (Must contain include\ and lib\)
set "OPENSSL_DIR=Z:/openssl-master"

:: Path to your MinGW bin directory (where g++.exe is located)
set "MINGW_BIN=Z:/w64devkit/bin"

:: Path to your CMake bin directory
set "CMAKE_ROOT=Z:/cmake-4.2.1-windows-x86_64"

:: Path to your Ninja directory
set "NINJA_ROOT=Z:/ninja"

:: Path to your LLVM directory
set "LLVM_INSTALL_DIR=Z:/libclang"


:: ============================================================
:: 2. ENVIRONMENT SETUP
:: ============================================================

echo Setting up environment...
set "PATH=%MINGW_BIN%;%CMAKE_ROOT%/bin;%NINJA_ROOT%;%PATH%"

:: ============================================================
:: 3. CONFIGURE QT
:: ============================================================

echo Starting Configure...

:: NOTE: 
:: -platform win32-g++   : Targets MinGW
:: -static-runtime       : Statically links libgcc/libstdc++ (No MinGW DLLs needed)
:: -openssl-linked       : Links OpenSSL inside the executable

call "%QT_SRC%\configure.bat" ^
    -static ^
    -release ^
    -platform win32-g++ ^
    -static-runtime ^
    -opensource -confirm-license ^
    -optimize-size ^
    -opengl desktop ^
    -no-pch ^
    -no-icu ^
    -no-dbus ^
    -no-glib ^
    -feature-linguist ^
    -no-feature-qtdiag ^
    -no-feature-sql ^
    -no-feature-testlib ^
    -nomake examples ^
    -nomake tests ^
    -skip qt3d -skip qt5compat -skip qtactiveqt -skip qtandroidextras -skip qtcharts -skip qtcoap -skip qtgraphs ^
    -skip qtconnectivity -skip qtdatavis3d -skip qtdeclarative -skip qtdoc ^
    -skip qtgamepad -skip qtgrpc -skip qtgraphicaleffects -skip qthttpserver -skip qtimageformats ^
    -skip qtlanguageserver ^
    -skip qtlocation -skip qtlottie -skip qtmacextras -skip qtmqtt -skip qtmultimedia ^
    -skip qtnetworkauth -skip qtopcua -skip qtpositioning -skip qtpurchasing -skip qtquick3d -skip qtquick3dphysics ^
    -skip qtquickcontrols -skip qtquickcontrols2 -skip qtquickeffectmaker -skip qtquicktimeline ^
    -skip qtremoteobjects -skip qtscript -skip qtscxml -skip qtsensors ^
    -skip qtserialbus -skip qtserialport -skip qtshadertools -skip qtspeech -skip qtsvg ^
    -skip qttranslations -skip qtvirtualkeyboard ^
    -skip qtwayland -skip qtwebchannel -skip qtwebengine -skip qtwebglplugin ^
    -skip qtwebsockets -skip qtwebview -skip qtwinextras -skip qtxmlpatterns ^
    -openssl-linked ^
    OPENSSL_LIBS="-L H:/openssl-static/lib -lssl -lcrypto -lws2_32 -lgdi32 -ladvapi32 -lcrypt32 -luser32" ^
    -prefix %QT_INSTALL_DIR% ^
    -- ^
    -DOPENSSL_ROOT_DIR=%OPENSSL_DIR% ^
    -DOPENSSL_USE_STATIC_LIBS=ON

if %errorlevel% neq 0 (
    echo Configure failed!
    pause
    exit /b 1
)

:: ============================================================
:: 4. BUILD
:: ============================================================

echo Configure successful. Starting Build...
:: -j uses all available CPU cores
cmake --build . --parallel

if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo ============================================
echo Build Complete.
echo ============================================

cmake --install .

echo ============================================
echo Install Complete.
echo ============================================

pause
