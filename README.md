# 🏔️ SkyRun Brian Head | Income Estimator

This interactive **Short-Term Rental Income Estimator** was developed for **SkyRun Brian Head** to help property owners and partners project potential rental income based on market-specific data, occupancy, and seasonality.

---

## 🔧 Features

- 📊 **Dynamic income forecasting**
  - Adjusts automatically by **Base Rate**, **Occupancy**, **Bedrooms**, and **Property Style**
- 📅 **Real booking & seasonality patterns**
  - Brian Head, Duck Creek, and Panguitch Lake data-driven models
- 💡 **Sensitivity Analysis**
  - Estimates Conservative, Expected, and Optimistic outcomes
- 📈 **Interactive Charts**
  - Revenue by month
  - Booking lead-time curve
- 🏡 **Owner-friendly interface**
  - Editable property photo, notes, and live export to CSV
- 🖨️ **Print to PDF**
  - Generates polished one-page property reports for owners

---

## 🌐 Hosting

This tool is a **static HTML file**, so it can be hosted anywhere.  
For GitHub Pages:

1. Upload `index.html` to the repo root.
2. Go to **Settings → Pages → Build and Deployment**.
3. Set **Source = Deploy from a branch**, and choose **Branch = main / (root)**.
4. GitHub Pages will auto-deploy your site.

🔗 Once live, it’ll be accessible at:
```
https://<your-username>.github.io/skyrun-income-estimator/
```

---

## 🧠 Maintenance & Customization

To update local branding or settings:

| Section | Description | File/Tag to Edit |
|----------|--------------|------------------|
| **Logo** | SkyRun Brian Head vertical logo | `<img class="logo">` in HTML |
| **Management Fee** | Default is `29.7%` | `mgmtFee` input value |
| **Seasonality Models** | Based on 3 regions | Update `seasonalityByBed`, `duck`, or `pang` objects in script |
| **Style Colors** | SkyRun palette (blue, green, yellow) | CSS root variables |

No build tools required — just edit and push.

---

## 🧩 Embedding on the Main Website

This estimator can be embedded or linked directly on the Brian Head website.

**Option 1:** Add a link in the nav menu  
```
https://<your-username>.github.io/skyrun-income-estimator/
```

**Option 2:** Embed via `<iframe>`  
```html
<iframe src="https://<your-username>.github.io/skyrun-income-estimator/" width="100%" height="1200" style="border:none;"></iframe>
```

---

## 👥 Contact

**Developed by:**  
_Alexander Youngblood Soria_  
SkyRun Brian Head | Operations & Data  

📧 [alex@skyrunbrianhead.com](mailto:alex@skyrunbrianhead.com)  
🌎 [https://skyrunbrianhead.com](https://skyrunbrianhead.com)

---

> _“Creating memories, simplifying ownership.”_
