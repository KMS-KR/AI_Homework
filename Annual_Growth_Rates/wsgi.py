from app import app as application

if __name__ == "__main__":
    # Optional local run for testing the WSGI entrypoint
    application.run(host="0.0.0.0", port=5000)
