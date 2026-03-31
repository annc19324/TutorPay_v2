# TutorPay - Hệ thống quản lý lương gia sư

TutorPay là web app giúp gia sư quản lý lịch dạy, tính lương tự động, quản lý học sinh và xuất báo cáo PDF.

## 🚀 Tech Stack
- **Frontend**: React.js (Vite) → Deploy Vercel
- **Backend**: Node.js + Express.js → Deploy Render
- **Database**: PostgreSQL (NeonDB)

## ✨ Tính năng
- 🔐 Đăng ký / Đăng nhập (JWT + bcrypt)
- 👑 Admin Panel - quản lý người dùng, đặt lại mật khẩu
- 📚 Quản lý buổi dạy - tính lương tự động
- 👨‍🎓 Quản lý học sinh
- 💳 Theo dõi thanh toán & công nợ
- 📊 Dashboard với biểu đồ
- 📄 Xuất PDF: bảng lương, báo cáo học sinh, báo cáo năm

## 🛠️ Cách chạy

### Backend
```bash
cd server
npm install
npm run migrate  # tạo bảng + tài khoản admin
npm run dev
```

### Frontend
```bash
cd client
npm install
npm run dev
```

## 🌐 Deploy

### Render (Backend)
1. Tạo Web Service trên Render
2. Root Directory: `server`
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Thêm env vars: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`

### Vercel (Frontend)
1. Import repo vào Vercel
2. Root Directory: `client`
3. Thêm env var: `VITE_API_URL=https://your-render-url.onrender.com/api`

## 📱 Tài khoản admin mặc định
- Username: `annc19324`
- Password: `Zeanokai@1`
