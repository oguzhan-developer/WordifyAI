#!/bin/bash

# Agent-1's main script - Stateful Version

# Get the current timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M")

# Count how many times Agent-1 has already posted to decide what to say next
AGENT1_POST_COUNT=$(grep -c "\[AGENT-1" agents_chat.txt)

# Default response
RESPONSE="
[AGENT-1 | $TIMESTAMP]

📌 Genel Değerlendirme:
- Agent-2'nin teknik analizi ışığında, projenin yönü netleşiyor. Kullanıcı odaklı özelliklerle teknik altyapıyı senkronize ilerletmeliyiz.

🎨 Tasarım & UX İyileştirmeleri:
- Öneri: Onboarding sürecinde 'ilgi alanları' (örneğin, seyahat, iş, teknoloji) sormak, kullanıcıya özel kelime setleri sunmamızı sağlar. Bu, kişiselleştirmeyi en başından hissettirir.
- Neden gerekli: Jenerik kelime listeleri sıkıcı olabilir. Kişiselleştirme, öğrenme motivasyonunu artırır.
- Kullanıcıya etkisi: Kullanıcı, kendi ilgi alanına yönelik kelimeler öğrendiği için platformu daha faydalı bulur.

🚀 Yeni Özellik Fikirleri:
- Özellik adı: 'Kelime Kartı (Flashcard) Oluşturucu'
- Kısa açıklama: Kullanıcıların kendi kelime listelerinden otomatik olarak dijital flashcard'lar oluşturmasını sağlayan bir araç. Arka yüzünde kelimenin anlamı, örnek cümle ve belki bir görsel olabilir.
- Öğrenmeye katkısı: Aktif öğrenmeyi (active recall) teşvik eder, bu da bilgiyi hafızada tutmanın en etkili yollarından biridir.

🔁 Agent-2’ye Notlar:
- Auth.js entegrasyonu önceliğine katılıyorum. Bu, kişiselleştirme özelliklerinin temelini oluşturacak.
- Onboarding için 'ilgi alanları' özelliğini eklemeyi teknik olarak değerlendirebilir misin? Veritabanı şemasını nasıl etkiler?
- Flashcard oluşturucu için bir görsel API (örn. Unsplash) entegrasyonu ileride düşünülebilir mi?
"

# Use case/switch statement for different responses based on post count
case $AGENT1_POST_COUNT in
  0)
    RESPONSE="
[AGENT-1 | $TIMESTAMP]

📌 Genel Değerlendirme:
- WordBox projesinin başlangıç aşamasındayız. Henüz bir ürün veya kullanıcı deneyimi girdisi mevcut değil. Potansiyel yüksek.

🎨 Tasarım & UX İyileştirmeleri:
- Öneri: Kullanıcıyı karşılayan, motive edici bir onboarding süreci tasarlayalım. Kelime öğrenme hedefleri belirletelim.
- Neden gerekli: İlk etkileşim kritik. Kullanıcıya yol haritası sunmak, bağlılığı artırır.
- Kullanıcıya etkisi: Platformu daha anlamlı ve kişisel bulur.

🚀 Yeni Özellik Fikirleri:
- Özellik adı: 'Streak' (Seri) Sistemi
- Kısa açıklama: Kullanıcının her gün yaptığı pratikleri takip eden ve ödüllendiren bir sistem. Örneğin, 7 günlük seri yakalayana rozet verilebilir.
- Öğrenmeye katkısı: Düzenli tekrarı teşvik eder, bu da kelime öğreniminde en önemli faktörlerden biridir.

⚡ Performans & Sistem Fikirleri:
- Frontend: Next.js kullanımı modern ve performanslı bir başlangıç. Bileşen bazlı mimari (örneğin Shadcn/ui) ile geliştirme hızı artırılabilir.
- Backend: Kelime veritabanı ve kullanıcı ilerlemesi için ölçeklenebilir bir veritabanı (örneğin PostgreSQL) ve API mimarisi (örneğin tRPC veya GraphQL) düşünülmeli.

🔐 Güvenlik & Güvenilirlik:
- Olası risk: Kullanıcı verilerinin (e-posta, şifre, öğrenme ilerlemesi) güvenliği en başından sağlanmalı.
- Önleyici çözüm: Auth.js (NextAuth.js) gibi kütüphanelerle güvenli kimlik doğrulama implemente edilmeli. Veritabanı erişimi sıkı kurallara bağlanmalı.

🔁 Agent-2’ye Notlar:
- Projenin temelini sağlam atmalıyız. İlk olarak, kullanıcı kaydı ve girişi özelliklerini geliştirebilir miyiz? Bu, diğer tüm özellikler için bir temel oluşturacaktır.
- Kelime ekleme ve listeleme için basit bir arayüz ve API endpoint'i de öncelikli olabilir.
"
    ;;
esac

# Append the chosen response to agents_chat.txt
echo -e "$RESPONSE" >> agents_chat.txt
