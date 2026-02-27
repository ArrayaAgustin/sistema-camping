-- CreateTable
CREATE TABLE `personas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dni` VARCHAR(8) NOT NULL,
    `apellido` VARCHAR(100) NULL,
    `nombres` VARCHAR(100) NULL,
    `nombre_completo` VARCHAR(200) NULL,
    `sexo` ENUM('M', 'F', 'X') NULL,
    `fecha_nacimiento` DATE NULL,
    `email` VARCHAR(100) NULL,
    `telefono` VARCHAR(50) NULL,
    `qr_code` VARCHAR(64) NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_personas_dni`(`dni`),
    UNIQUE INDEX `uq_personas_qr`(`qr_code`),
    INDEX `idx_personas_apellido`(`apellido`),
    INDEX `idx_personas_dni`(`dni`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invitados` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `persona_id` INTEGER NOT NULL,
    `vigente_desde` DATE NULL,
    `vigente_hasta` DATE NULL,
    `aplica_a_familia` BOOLEAN NULL DEFAULT true,
    `activo` BOOLEAN NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_invitados_activo`(`activo`),
    INDEX `idx_invitados_persona`(`persona_id`),
    INDEX `idx_invitados_vigencia`(`vigente_hasta`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `afiliados` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `persona_id` INTEGER NULL,
    `cuil` VARCHAR(11) NOT NULL,
    `sexo` ENUM('M', 'F', 'X') NOT NULL,
    `tipo_afiliado` VARCHAR(50) NULL,
    `fecha_nacimiento` DATE NULL,
    `categoria` VARCHAR(100) NULL,
    `situacion_sindicato` ENUM('ACTIVO', 'BAJA') NULL DEFAULT 'ACTIVO',
    `situacion_obra_social` ENUM('ACTIVO', 'BAJA') NULL DEFAULT 'ACTIVO',
    `domicilio` VARCHAR(255) NULL,
    `provincia` VARCHAR(100) NULL,
    `localidad` VARCHAR(100) NULL,
    `empresa_cuit` VARCHAR(11) NULL,
    `empresa_nombre` VARCHAR(200) NULL,
    `codigo_postal` VARCHAR(10) NULL,
    `grupo_sanguineo` VARCHAR(5) NULL,
    `foto_url` VARCHAR(255) NULL,
    `padron_version_id` INTEGER NULL,
    `activo` BOOLEAN NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_afiliados_persona`(`persona_id`),
    UNIQUE INDEX `cuil`(`cuil`),
    INDEX `idx_activo`(`activo`),
    INDEX `idx_cuil`(`cuil`),
    INDEX `idx_empresa_cuit`(`empresa_cuit`),
    INDEX `idx_padron_version`(`padron_version_id`),
    INDEX `idx_persona_id`(`persona_id`),
    INDEX `idx_situacion_sindicato`(`situacion_sindicato`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `familiares` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `persona_id` INTEGER NULL,
    `afiliado_id` INTEGER NOT NULL,
    `estudia` BOOLEAN NULL DEFAULT false,
    `discapacitado` BOOLEAN NULL DEFAULT false,
    `baja` BOOLEAN NULL DEFAULT false,
    `activo` BOOLEAN NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_afiliado_activo`(`afiliado_id`, `activo`),
    INDEX `idx_afiliado_id`(`afiliado_id`),
    INDEX `idx_familiares_persona`(`persona_id`),
    INDEX `idx_baja`(`baja`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `email` VARCHAR(100) NULL,
    `afiliado_id` INTEGER NULL,
    `persona_id` INTEGER NULL,
    `activo` BOOLEAN NULL DEFAULT true,
    `ultimo_acceso` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `username`(`username`),
    UNIQUE INDEX `usuarios_persona_id_key`(`persona_id`),
    INDEX `idx_activo`(`activo`),
    INDEX `idx_afiliado`(`afiliado_id`),
    INDEX `idx_username`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(50) NOT NULL,
    `descripcion` TEXT NULL,
    `permisos` JSON NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `nombre`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario_roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `rol_id` INTEGER NOT NULL,
    `camping_id` INTEGER NULL,
    `activo` BOOLEAN NULL DEFAULT true,
    `fecha_asignacion` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `unique_usuario_rol_camping`(`usuario_id`, `rol_id`, `camping_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `padron_versiones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `version` VARCHAR(50) NOT NULL,
    `fecha_actualizacion` TIMESTAMP(0) NOT NULL,
    `total_afiliados` INTEGER NULL DEFAULT 0,
    `total_familiares` INTEGER NULL DEFAULT 0,
    `descripcion` TEXT NULL,
    `hash_checksum` VARCHAR(64) NULL,
    `usuario_carga_id` INTEGER NULL,
    `activo` BOOLEAN NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `version`(`version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(200) NOT NULL,
    `ubicacion` VARCHAR(255) NULL,
    `provincia` VARCHAR(100) NULL,
    `localidad` VARCHAR(100) NULL,
    `telefono` VARCHAR(50) NULL,
    `email` VARCHAR(100) NULL,
    `activo` BOOLEAN NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visitas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(36) NOT NULL,
    `persona_id` INTEGER NULL,
    `afiliado_id` INTEGER NULL,
    `camping_id` INTEGER NOT NULL,
    `periodo_caja_id` INTEGER NULL,
    `usuario_registro_id` INTEGER NOT NULL,
    `condicion_ingreso` ENUM('AFILIADO', 'FAMILIAR', 'INVITADO', 'DESCONOCIDO') NULL DEFAULT 'DESCONOCIDO',
    `fecha_ingreso` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_egreso` TIMESTAMP(0) NULL,
    `acompanantes` JSON NULL,
    `observaciones` TEXT NULL,
    `sincronizado` BOOLEAN NULL DEFAULT true,
    `registro_offline` BOOLEAN NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uuid`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `periodos_caja` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `camping_id` INTEGER NOT NULL,
    `usuario_apertura_id` INTEGER NOT NULL,
    `usuario_cierre_id` INTEGER NULL,
    `fecha_apertura` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_cierre` TIMESTAMP(0) NULL,
    `total_visitas` INTEGER NULL DEFAULT 0,
    `observaciones` TEXT NULL,
    `sincronizado` BOOLEAN NULL DEFAULT true,
    `activo` BOOLEAN NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sync_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `camping_id` INTEGER NULL,
    `tipo` ENUM('visita', 'egreso', 'cierre_caja', 'batch', 'padron') NOT NULL,
    `registros_sincronizados` INTEGER NULL DEFAULT 0,
    `fecha_sync` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `estado` ENUM('success', 'partial', 'failed') NULL DEFAULT 'success',
    `errores` JSON NULL,
    `detalles` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auditoria_padron` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `accion` ENUM('INSERT', 'UPDATE', 'DELETE', 'IMPORT') NOT NULL,
    `tabla` VARCHAR(50) NOT NULL,
    `registro_id` INTEGER NOT NULL,
    `datos_anteriores` JSON NULL,
    `datos_nuevos` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configuracion_sistema` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clave` VARCHAR(100) NOT NULL,
    `valor` TEXT NULL,
    `tipo` ENUM('string', 'number', 'boolean', 'json') NULL DEFAULT 'string',
    `descripcion` TEXT NULL,
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `clave`(`clave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `invitados` ADD CONSTRAINT `invitados_persona_id_fkey` FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `afiliados` ADD CONSTRAINT `afiliados_persona_id_fkey` FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `afiliados` ADD CONSTRAINT `afiliados_padron_version_id_fkey` FOREIGN KEY (`padron_version_id`) REFERENCES `padron_versiones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `familiares` ADD CONSTRAINT `familiares_persona_id_fkey` FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `familiares` ADD CONSTRAINT `familiares_afiliado_id_fkey` FOREIGN KEY (`afiliado_id`) REFERENCES `afiliados`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_afiliado_id_fkey` FOREIGN KEY (`afiliado_id`) REFERENCES `afiliados`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_persona_id_fkey` FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario_roles` ADD CONSTRAINT `usuario_roles_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario_roles` ADD CONSTRAINT `usuario_roles_rol_id_fkey` FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario_roles` ADD CONSTRAINT `usuario_roles_camping_id_fkey` FOREIGN KEY (`camping_id`) REFERENCES `campings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visitas` ADD CONSTRAINT `visitas_persona_id_fkey` FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visitas` ADD CONSTRAINT `visitas_afiliado_id_fkey` FOREIGN KEY (`afiliado_id`) REFERENCES `afiliados`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visitas` ADD CONSTRAINT `visitas_camping_id_fkey` FOREIGN KEY (`camping_id`) REFERENCES `campings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visitas` ADD CONSTRAINT `visitas_periodo_caja_id_fkey` FOREIGN KEY (`periodo_caja_id`) REFERENCES `periodos_caja`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visitas` ADD CONSTRAINT `visitas_usuario_registro_id_fkey` FOREIGN KEY (`usuario_registro_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `periodos_caja` ADD CONSTRAINT `periodos_caja_camping_id_fkey` FOREIGN KEY (`camping_id`) REFERENCES `campings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `periodos_caja` ADD CONSTRAINT `periodos_caja_usuario_apertura_id_fkey` FOREIGN KEY (`usuario_apertura_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `periodos_caja` ADD CONSTRAINT `periodos_caja_usuario_cierre_id_fkey` FOREIGN KEY (`usuario_cierre_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sync_logs` ADD CONSTRAINT `sync_logs_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sync_logs` ADD CONSTRAINT `sync_logs_camping_id_fkey` FOREIGN KEY (`camping_id`) REFERENCES `campings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditoria_padron` ADD CONSTRAINT `auditoria_padron_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

