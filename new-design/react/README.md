React + Vite preview for Concursando modern UI

How to run locally:
1. cd new-design/react
2. npm install
3. npm run dev

Build and deploy to replace current frontend files:
1. npm run build
2. npm run deploy:copy   # will copy dist/* to quiz-frontend root (careful: will overwrite files)

Notes:
- Tailwind is preconfigured. Adjust styles in `src/styles/globals.css` and components.
- After deploy: open `index.html` at quiz-frontend root to see the built app.
