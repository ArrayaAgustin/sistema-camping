// Normaliza usuarios antiguos con afiliado_id -> persona_id
// Ejecutar manualmente cuando sea necesario
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.usuarios.findMany({
    where: {
      persona_id: null,
      afiliado_id: { not: null }
    }
  });

  let updated = 0;

  for (const user of users) {
    const afiliado = await prisma.afiliados.findUnique({ where: { id: user.afiliado_id } });
    if (!afiliado?.persona_id) continue;

    const persona = await prisma.personas.findUnique({ where: { id: afiliado.persona_id } });
    if (!persona?.dni) continue;

    const passwordHash = await bcrypt.hash(persona.dni, 10);

    await prisma.usuarios.update({
      where: { id: user.id },
      data: {
        persona_id: afiliado.persona_id,
        afiliado_id: null,
        password_hash: passwordHash,
        must_change_password: true,
        updated_at: new Date()
      }
    });

    updated += 1;
  }

  console.log(`Usuarios actualizados: ${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
