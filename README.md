# Sistema de Turnos

Backend para la gestión de turnos entre clientes y proveedores, con cálculo dinámico de disponibilidad, manejo de zonas horarias y control de estados del turno.

El sistema está diseñado para reflejar un flujo real de reservas, evitando la persistencia de slots y calculando la disponibilidad en tiempo real a partir de reglas y eventos existentes.

---

## Tecnologías utilizadas

- Node.js
- NestJS
- Prisma ORM
- PostgreSQL
- JWT (JSON Web Tokens)
- Luxon (manejo de fechas y zonas horarias)

---

## Arquitectura general

El sistema se basa en los siguientes principios:

- Autenticación con JWT
- Control de acceso por roles
- Persistencia de fechas en UTC
- Conversión de horarios según la zona horaria del usuario
- Cálculo dinámico de disponibilidad (no se guardan slots)

---

## Roles del sistema

### ADMIN
- Puede crear usuarios con rol PROVIDER

### PROVIDER
- Gestiona su perfil profesional
- Define servicios (duración y buffer)
- Define reglas de disponibilidad semanales
- Define excepciones de disponibilidad (feriados, ausencias)
- Visualiza su agenda
- Actualiza el estado de los turnos

### CLIENT
- Consulta slots disponibles
- Reserva turnos
- Visualiza sus turnos
- Cancela turnos propios

---

## Manejo de zonas horarias

- Todas las fechas se almacenan en la base de datos en UTC
- Cada provider define su zona horaria
- El cliente puede solicitar los datos en su propia zona horaria
- El sistema convierte automáticamente los horarios de entrada y salida

Esto permite que un mismo turno se visualice correctamente desde distintas ubicaciones geográficas.

---

## Disponibilidad dinámica (feature principal)

Los slots disponibles no se almacenan en la base de datos.

Se calculan dinámicamente combinando:

- Reglas semanales de disponibilidad
- Excepciones de disponibilidad
- Duración del servicio + buffer
- Turnos existentes
- Turnos cancelados no bloquean disponibilidad

Cuando un turno se cancela, el horario vuelve a estar disponible automáticamente.

---

## Flujo principal del sistema

1. El provider define su perfil y zona horaria
2. El provider crea servicios con duración y buffer
3. El provider define reglas semanales de disponibilidad
4. El provider define excepciones (feriados, ausencias)
5. El cliente consulta los slots disponibles
6. El cliente reserva un turno
7. El sistema recalcula la disponibilidad
8. El cliente puede cancelar el turno
9. El slot vuelve a estar disponible

---

## Estados del turno

- PENDING
- CONFIRMED
- COMPLETED
- NO_SHOW
- CANCELLED

Los estados reflejan el ciclo de vida real de una reserva y determinan si el turno bloquea o no la disponibilidad.

Reglas de negocio:

- Solo los turnos en estado CONFIRMED pueden cambiar de estado
- COMPLETED, NO_SHOW y CANCELLED son estados finales
- Los turnos CANCELLED no bloquean la disponibilidad

---

## Endpoints principales

### Autenticación
- POST /auth/register
- POST /auth/login
- GET /auth/me

### Provider
- POST /providers/me/profile
- GET /providers/me/profile
- POST /providers/me/services
- GET /providers/me/services
- POST /providers/me/availability/rules
- POST /providers/me/availability/exceptions
- GET /providers/me/appointments
- PATCH /providers/me/appointments/:id/status

### Cliente
- POST /appointments
- GET /appointments/me
- PATCH /appointments/:id/cancel

---

## Ejecución del proyecto

### Requisitos previos

- Node.js v18 o superior
- npm
- PostgreSQL 14 o superior
- Git

---

### Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd turnos-api
```

---

### Instalación de dependencias

```bash
npm install
```

---

### Configuración de variables de entorno

Crear un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/turnos"
JWT_SECRET="super-secret-key"
```

Notas importantes:
- La base de datos `turnos` debe existir previamente en PostgreSQL
- `JWT_SECRET` puede ser cualquier string seguro

---

### Migraciones de base de datos (Prisma)

```bash
npx prisma migrate dev
```

Opcional:

```bash
npx prisma generate
```

---

### Ejecución del servidor en modo desarrollo

```bash
npm run start:dev
```

Si todo está configurado correctamente, la consola mostrará:

```text
Nest application successfully started
```

---

### Servidor disponible en

```
http://localhost:3000
```

---

### Verificación rápida

```bash
curl http://localhost:3000
```

Respuesta esperada:

```text
Hello World!
```
