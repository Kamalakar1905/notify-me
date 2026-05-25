@echo off
set "JAVA_HOME=C:\Program Files\Java\jdk-21"
set "PATH=C:\tools\apache-maven-3.9.6\bin;C:\Program Files\Java\jdk-21\bin;%PATH%"

echo [1/2] Building JAR...
call mvn package -DskipTests -q
if %ERRORLEVEL% NEQ 0 (
    echo BUILD FAILED
    exit /b 1
)

echo [2/2] Starting Notify Me Backend on port 8080...
java -jar target\notify-me-backend-1.0.0.jar
