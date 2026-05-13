import { PrismaClient, SystemRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: { name: 'Organização Demo', slug: 'default' },
  });

  const org = await prisma.organization.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'SEC-ADM' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Secretaria Administrativa', code: 'SEC-ADM' },
  });

  const dept = await prisma.department.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'DEPT-PROTO' } },
    update: {},
    create: { organizationId: org.id, name: 'Departamento de Protocolo', code: 'DEPT-PROTO' },
  });

  const unit = await prisma.unit.upsert({
    where: { departmentId_code: { departmentId: dept.id, code: 'SET-PROT-01' } },
    update: {},
    create: { departmentId: dept.id, name: 'Setor de Protocolo Central', code: 'SET-PROT-01' },
  });

  const funRole = await prisma.role.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'protocolista' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Protocolista',
      slug: 'protocolista',
      description: 'Abertura e tramitação de processos',
      permissions: { processes: ['create', 'move'] },
    },
  });

  await prisma.processType.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'REQ-SERV' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Requerimento de Serviço',
      code: 'REQ-SERV',
      description: 'Processo administrativo genérico',
    },
  });

  await prisma.documentTemplate.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'REQ-BASE' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Requerimento base',
      code: 'REQ-BASE',
      body: 'Ilmo(a). Sr(a).\n\n{{interessado}} requer...\n\n{{data}}',
      variables: { interessado: 'string', data: 'date' },
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@ged.local' },
    update: {
      passwordHash,
      systemRole: SystemRole.ADMIN,
      organizationId: org.id,
      departmentId: dept.id,
      unitId: unit.id,
      roleId: funRole.id,
    },
    create: {
      email: 'admin@ged.local',
      passwordHash,
      name: 'Administrador',
      systemRole: SystemRole.ADMIN,
      tenantId: tenant.id,
      organizationId: org.id,
      departmentId: dept.id,
      unitId: unit.id,
      roleId: funRole.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed concluído: admin@ged.local / Admin123!');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
