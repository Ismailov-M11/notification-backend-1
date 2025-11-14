import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// ✅ Socket.IO с разрешением для всех источников
const io = new Server(server, {
  cors: {
    origin: "*", // можно указать конкретный IP, например: "http://192.168.1.114:8080"
    methods: ["GET", "POST"],
  },
});

// 🗺️ Список подключённых аптек
const connectedPharmacies = new Map();

io.on("connection", (socket) => {
  console.log("✅ Новое подключение:", socket.id);

  // Когда аптека логинится
  socket.on("pharmacy_login", (data) => {
    const { pharmacy_id } = data;
    if (pharmacy_id) {
      connectedPharmacies.set(pharmacy_id, socket.id);
      console.log(`💊 Аптека вошла: ${pharmacy_id}`);
      socket.emit("login_success", { message: "Login successful" });
    }
  });

  // Когда аптека отключается
  socket.on("disconnect", () => {
    for (const [id, sockId] of connectedPharmacies.entries()) {
      if (sockId === socket.id) {
        connectedPharmacies.delete(id);
        console.log(`❌ Аптека отключена: ${id}`);
        break;
      }
    }
  });
});

// 🔔 Endpoint для отправки уведомлений
app.post("/api/notify", (req, res) => {
  const { pharmacy_id, drugs, total } = req.body;

  if (!pharmacy_id) {
    return res.status(400).json({ error: "pharmacy_id is required" });
  }

  const socketId = connectedPharmacies.get(pharmacy_id);

  if (!socketId) {
    console.log(`⚠️ Аптека ${pharmacy_id} не подключена`);
    return res.status(404).json({ error: "Pharmacy not connected" });
  }

  const payload = { pharmacy_id, drugs, total };

  io.to(socketId).emit("incoming_call", payload);
  console.log(`📨 Уведомление отправлено аптеке ${pharmacy_id}:`, payload);

  res.json({ success: true, message: "Notification sent", payload });
});

// 🚀 Запуск сервера (обязательно для Render!)
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
