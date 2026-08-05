import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { ProductsModule } from './products/products.module';
import { PurchasesModule } from './purchases/purchases.module';
import { AgricultureModule } from './agriculture/agriculture.module';
import { ApplicationsModule } from './applications/applications.module';
import { InventoryModule } from './inventory/inventory.module';
import { FinanceModule } from './finance/finance.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, ProductsModule, PurchasesModule, AgricultureModule, ApplicationsModule, InventoryModule, FinanceModule, SuppliersModule, AuditModule],
  controllers: [HealthController],
})
export class AppModule {}
