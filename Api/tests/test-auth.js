const bcrypt = require("bcrypt");

const password = "admin123"; // Contraseña nueva
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error("Error generando hash:", err);
  } else {
    console.log("Nuevo hash generado:", hash);
  }
});