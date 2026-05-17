Render (또는 유사 호스팅) 배포용 설정 안내

- Root Directory: Annual_Growth_Rates
- Build Command: pip install -r requirements.txt
- Start Command: gunicorn wsgi:application --bind 0.0.0.0:$PORT
- Language / Runtime: Python 3
- Branch: main (또는 배포할 브랜치)
- Region: 원하는 리전 선택
- Instance Type: 필요 리소스에 맞춰 선택 (Starter/Free 가능)

Environment Variables (권장):
- SECRET_KEY: <복잡한 임의 문자열>  # 세션 암호화용
- FLASK_DEBUG: 0 또는 1 (선택사항)

설명:
- 저장소 루트에 여러 프로젝트가 있을 때는 반드시 `Root Directory`에
  "Annual_Growth_Rates"를 지정해야 합니다. 이렇게 하면 Minesweeper 폴더는 배포에서 제외됩니다.
- `Build Command`는 프로젝트 폴더 안의 `requirements.txt`를 사용합니다.
- `Start Command`는 `gunicorn`으로 WSGI 엔트리포인트 `wsgi:application`을 실행합니다.
