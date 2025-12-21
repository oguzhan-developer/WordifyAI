#!/bin/bash

# Agent-2's main script - Stateful Version

# Get the current timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M")

# Count how many times Agent-2 has already posted
AGENT2_POST_COUNT=$(grep -c "\[AGENT-2" agents_chat.txt)

# Default response for subsequent turns
RESPONSE="
[AGENT-2 | $TIMESTAMP]

📌 Genel Değerlendirme:
- Agent-1'in yeni fikirleri (ilgi alanları, flashcard oluşturucu) projenin kullanıcı değerini artırma potansiyeline sahip. Teknik olarak fizibilitelerini değerlendirelim.

🛠️ Teknik Analiz ve Uygulama Adımları:

- **'İlgi Alanları' Özelliği:**
  - **Analiz:** Bu özellik, \`User\` modeline ek olarak bir \`Interest\` modeli ve aralarında bir 'many-to-many' ilişkisi (örneğin \`UserInterests\` join tablosu) gerektirir. Ayrıca, kelimeleri kategorize etmek için bir \`Category\` modeline ve \`WordCategory\` ilişkisine ihtiyacımız olacak.
  - **Uygulama:** Prisma şeması güncellenmeli. Onboarding formuna çoktan seçmeli bir 'ilgi alanları' bölümü eklenebilir. API, bu seçimleri alıp veritabanına kaydetmeli.

- **'Flashcard Oluşturucu':**
  - **Analiz:** Bu, temelde bir frontend özelliği. Kullanıcının kelime listesini (örneğin 'öğrenilecekler' listesi) alıp, bunu interaktif bir arayüze dönüştüreceğiz. State yönetimi için Zustand veya React Context kullanılabilir.
  - **Uygulama:** Yeni bir Next.js route'u (\`/flashcards\`) oluşturulabilir. Bu sayfada, kullanıcının kelimelerini çeken bir client-side data fetching işlemi yapılır. Kartları çevirme animasyonları için CSS transition'ları veya bir kütüphane (Framer Motion gibi) kullanılabilir.

- **Görsel API Entegrasyonu:**
  - **Analiz:** Unsplash veya Pexels gibi ücretsiz API'ler, kelimeye göre görsel arama yapmamızı sağlar. Bu, sunucu tarafında (server-side) yapılmalı ve sonuç cache'lenmeli ki her seferinde API'ye istek atmayalım.
  - **Uygulama:** Bir server action veya API route oluşturulur. Bu endpoint, bir kelime alır, görsel API'sine istek atar ve dönen görsel URL'ini veritabanındaki \`Word\` modeline (örneğin \`imageUrl\` alanı) kaydeder.

🔁 Agent-1’e Notlar ve Sorular:
- 'İlgi alanları' için veritabanı şeması değişikliği gerekecek. Bu, ilk kurulumu biraz daha karmaşık hale getirir. Auth entegrasyonundan hemen sonra mı, yoksa temel kelime ekleme功能sinden sonra mı buna odaklanalım?
- Flashcard arayüzü için aklında belirli bir tasarım var mı? Basit bir 'ön yüz/arka yüz' mü, yoksa daha oyunlaştırılmış bir deneyim mi (örn. doğru/yanlış butonları)?
"

# Use case/switch statement for different responses
case $AGENT2_POST_COUNT in
  0)
    RESPONSE="
[AGENT-2 | $TIMESTAMP]

📌 Genel Değerlendirme:
- Agent-1'in değerlendirmesine katılıyorum. Sağlam bir temel oluşturmak için teknik gereksinimleri netleştirmemiz gerekiyor.

🛠️ Teknik Analiz ve Uygulama Adımları:

- **Onboarding Süreci:**
  - **Analiz:** Agent-1'in önerdiği 'hedef belirleme' özelliği için kullanıcı hedeflerini (örn. günlük öğrenilecek kelime sayısı) saklayacağımız bir veritabanı şeması gerekiyor.
  - **Uygulama:** Next.js \`app\` router'ı içinde \`/onboarding\` route'u oluşturulabilir. Bu route altında kullanıcı hedeflerini alan bir form ve bu veriyi veritabanına kaydeden bir API endpoint'i (server action veya route handler) geliştirilebilir.

- **'Streak' (Seri) Sistemi:**
  - **Analiz:** Bu özellik, kullanıcının son giriş yaptığı tarihi ve seri sayısını takip etmeyi gerektirir. \`User\` modeline \`lastLoginDate\` ve \`streakCount\` alanları eklenebilir.
  - **Uygulama:** Her kullanıcı girişinde bu alanları güncelleyen bir backend mantığı yazılmalı. Bir cron job veya serverless fonksiyon ile her günün sonunda serileri kontrol eden bir mekanizma da kurulabilir.

- **Performans & Sistem:**
  - **Frontend:** Shadcn/ui ve Tailwind CSS kullanımı, tasarım sistemini hızlıca oturtmamızı sağlar. Bu kütüphaneleri projeye ekleyerek başlayabiliriz.
  - **Backend:** PostgreSQL seçimi yerinde. Veritabanı ile etkileşim için Prisma ORM'i kullanalım. Tip güvenliği sağlar ve migration yönetimini kolaylaştırır. \`schema.prisma\` dosyasını oluşturarak başlamalıyız.
  - **API:** tRPC yerine Next.js'in kendi Route Handlers veya Server Actions yapısını kullanmak, başlangıç için daha az bağımlılık ve daha basit bir mimari sunar.

- **Güvenlik & Güvenilirlik:**
  - **Analiz:** NextAuth.js (yeni adıyla Auth.js) seçimi doğru. Credentials (kullanıcı adı/şifre) ve OAuth (Google, GitHub vb.) provider'larını destekleyecek şekilde konfigüre edilmeli.
  - **Uygulama:** \`app/api/auth/[...nextauth]\` route handler'ı oluşturulmalı. Veritabanı entrasyonu için Prisma Adapter'ı kullanılmalı. \`User\`, \`Account\`, \`Session\` modellerini şemaya eklemeliyiz.

🔁 Agent-1’e Notlar ve Sorular:
- Fikirlerin için teşekkürler. Teknik altyapıyı hazırlamaya başlıyorum.
- **Önceliklendirme:** İlk adım olarak Auth.js entrasyonu ve temel \`User\` modeli ile veritabanı kurulumunu yapacağım. Bu, diğer tüm özellikler için bir ön koşul. Katılıyor musun?
- **Onboarding Detayları:** Onboarding sürecinde kullanıcıdan tam olarak hangi bilgileri almalıyız? Sadece 'günlük kelime hedefi' mi, yoksa 'ilgi alanları' gibi başka veriler de toplayalım mı? Bu, veritabanı şemasını etkileyecektir.
"
    ;;
esac

# Append the chosen response to agents_chat.txt
echo -e "$RESPONSE" >> agents_chat.txt
