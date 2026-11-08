# Quantum Scan

Uzay görsellerini Google Teachable Machine modelinizle tarayan, sade HTML/CSS/JavaScript tabanlı tek sayfalı uygulama.

## GitHub Pages'e yükleme

1. ZIP'i açıp içindeki `quantumscan-github` klasörünün dosyalarını yeni GitHub deposunun kök dizinine yükleyin.
2. Depoda **Settings → Pages** bölümünü açın.
3. **Deploy from a branch** seçin; `main` dalını ve `/ (root)` klasörünü seçip kaydedin.
4. GitHub Pages adresi oluştuğunda siteyi açın. Teachable Machine modeli ve TensorFlow.js CDN'den geldiği için internet bağlantısı gerekir.

Uygulama için derleme adımı gerekmez. Yerelde çalıştırmak için depo kökünde `python3 -m http.server 8000` komutunu çalıştırıp `http://localhost:8000` adresini açabilirsiniz.

## İçerik ve gizlilik

`app.js`, Google Teachable Machine modelini `https://teachablemachine.withgoogle.com/models/EBy4ibzk_/` adresinden yükler. Görsel tahmini tarayıcıda yapılır; uygulamanın sunucu tarafı veya kullanıcı görseli yükleme API'si yoktur. NASA/ESA Webb gözlem görsellerinin kaynakları ve kredileri `PHOTO-CREDITS.md` dosyasındadır.
