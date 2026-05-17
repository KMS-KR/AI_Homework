import os
from flask import Flask, render_template, request, redirect, url_for, session, flash

# Flask application setup
app = Flask(__name__)
# Secret key is required for Flask session support.
# In production, set the `SECRET_KEY` environment variable.
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")

# Read the stored GDP records from the session.
def get_gdp_records():
    return session.get("gdp_records", [])

# Save the GDP records into the session.
def set_gdp_records(records):
    session["gdp_records"] = records

# Calculate the growth rate for each record.
def calculate_growth_records(records):
    # Sort records by year in ascending order.
    sorted_records = sorted(records, key=lambda item: item["year"])
    result_rows = []
    previous_gdp = None

    for record in sorted_records:
        year = record["year"]
        gdp = record["gdp"]

        if previous_gdp is None:
            growth_rate = None
        else:
            growth_rate = ((gdp - previous_gdp) / previous_gdp) * 100

        result_rows.append({
            "year": year,
            "gdp": gdp,
            "gdp_display": f"{gdp:,.2f}",
            "growth_rate": growth_rate,
        })

        previous_gdp = gdp

    return result_rows

@app.route("/", methods=["GET", "POST"])
def index():
    """Render the main page and handle form submissions."""
    gdp_records = get_gdp_records()

    if request.method == "POST":
        action = request.form.get("action", "add")

        if action == "calculate":
            if not gdp_records:
                flash("추가된 GDP 데이터가 없습니다. 먼저 데이터를 입력해주세요.", "error")
            else:
                flash("성장률이 계산되었습니다. 아래 표에서 결과를 확인하세요.", "success")
            return redirect(url_for("index"))

        year_text = request.form.get("year", "").strip()
        gdp_text = request.form.get("gdp", "").strip()

        if not year_text.isdigit():
            flash("연도는 정수여야 합니다. 예: 2020", "error")
            return redirect(url_for("index"))

        year = int(year_text)
        if year <= 0:
            flash("연도는 0 보다 커야 합니다.", "error")
            return redirect(url_for("index"))

        try:
            gdp = float(gdp_text)
        except ValueError:
            flash("GDP 값은 숫자이어야 합니다. 예: 1500.50", "error")
            return redirect(url_for("index"))

        if gdp <= 0:
            flash("GDP 값은 0보다 큰 숫자여야 합니다.", "error")
            return redirect(url_for("index"))

        if any(record["year"] == year for record in gdp_records):
            flash(f"{year}년 데이터가 이미 존재합니다. 중복 입력은 불가능합니다.", "error")
            return redirect(url_for("index"))

        gdp_records.append({"year": year, "gdp": gdp})
        set_gdp_records(gdp_records)
        flash(f"{year}년 GDP 데이터를 추가했습니다.", "success")
        return redirect(url_for("index"))

    rows = calculate_growth_records(gdp_records)
    return render_template("index.html", rows=rows)

if __name__ == "__main__":
    # Run the Flask development server on localhost:5000
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "").lower() in ("1", "true", "yes")
    app.run(host="0.0.0.0", port=port, debug=debug)
