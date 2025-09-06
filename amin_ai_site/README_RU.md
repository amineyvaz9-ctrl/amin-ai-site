# Amin AI — сайт проекта (PWA + демо распознавания)

## Как вставить свою модель
1) В Teachable Machine: **Export → TensorFlow.js → Download**.
2) Положите три файла в папку **/demo/model**:
   - `model.json`
   - `metadata.json`
   - `weights.bin`

## Как запустить локально
- Просто откройте `index.html` (для работы камеры лучше через локальный сервер, напр. `npx serve`).
- На телефоне загрузите сайт на GitHub Pages/Netlify и откройте ссылку.

## Деплой на GitHub Pages
1) Создайте репозиторий и загрузите все файлы.
2) В настройках → Pages → Source: `main / root`.
3) Через минуту сайт будет доступен по адресу `https://<user>.github.io/<repo>/`.

## Netlify
- netlify.com → New site from Git → выбрать репозиторий → Publish.

## Установка как приложение
- Android (Chrome): ⋮ → Add to Home screen.
- iOS (Safari): Share → Add to Home Screen.
