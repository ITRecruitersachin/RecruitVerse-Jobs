# RecruitVerse™ Jobs – USA & Canada

A responsive, static job-discovery portal built with HTML, CSS, JavaScript, and JSON. Designed for GitHub Pages.

## Features in this starter
- Search by title, skill, company, location, and keywords
- Filter by country, work mode, employment type, and seniority
- Job detail popup
- Related-job recommendations based on shared skills
- Mobile-responsive dark interface
- JSON-based job listings (no database required)

## 1. Create the GitHub repository
1. Sign in to GitHub.
2. Select **New repository**.
3. Name it `RecruitVerse-Jobs`.
4. Set visibility to **Public**.
5. Select **Add a README file** or leave it unchecked; either is fine.
6. Create the repository.

## 2. Upload the project files
Upload `index.html`, `styles.css`, `app.js`, `jobs.json`, and this `README.md` to the repository's top-level folder. Keep the filenames exactly as shown.

## 3. Enable GitHub Pages
1. Open the repository's **Settings**.
2. Select **Pages** from the left navigation.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`.
5. Save.
6. Wait for the Pages deployment to finish. Your site will be published at `https://YOUR-GITHUB-USERNAME.github.io/RecruitVerse-Jobs/`.

## 4. Add or update a job
1. Open `jobs.json` in GitHub.
2. Select the pencil icon to edit.
3. Copy an existing job object, including its opening and closing braces.
4. Change the ID, title, location, skills, description, requirements, and approved application URL.
5. Keep commas between job objects. The final object in the array must not have a trailing comma.
6. Commit the changes. GitHub Pages will redeploy automatically.

## 5. Job data rules
- Use a unique ID for every listing.
- Set `status` to `open` for active jobs and `closed` when filled or expired.
- Use an approved application URL in `applyUrl`. Leave it as an empty string until one is available.
- Verify job details, compensation, location, employment type, and work authorization requirements before publishing.
- Do not put candidate resumes, phone numbers, email addresses, or other personal data in this public repository.

## 6. Test locally
Because the page loads `jobs.json` using `fetch`, open it through a local web server rather than double-clicking `index.html`. If Python is installed, run this command in the project folder:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Important limitations of this first version
This is a public static job board, not a full applicant-tracking system. It does not authenticate recruiters, store applications, send email alerts, or protect private candidate data. The candidate profile button is a placeholder and must be replaced with a real, privacy-reviewed form URL before launch. The sample job records are demonstration data; verify or replace them before publishing.
