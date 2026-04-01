import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from incidents.models import Incident
from capas.models import CAPA

class Command(BaseCommand):
    help = 'Seed the HSE system with mock incidents and CAPAs for testing'

    def handle(self, *args, **kwargs):
        self.stdout.write('🌱 Seeding HSE System Mock Data...')

        # 1. Create Mock Users
        admin, _ = User.objects.get_or_create(username='admin', defaults={'is_staff': True, 'is_superuser': True, 'email': 'admin@safetyfirst.hse'})
        if _: admin.set_password('admin123'); admin.save()

        reporter, _ = User.objects.get_or_create(username='reporter', defaults={'email': 'reporter@safetyfirst.hse'})
        if _: reporter.set_password('reporter123'); reporter.save()

        investigator, _ = User.objects.get_or_create(username='investigator', defaults={'email': 'investigator@safetyfirst.hse'})
        if _: investigator.set_password('investig123'); investigator.save()

        self.stdout.write(self.style.SUCCESS(f'Successfully prepared 3 governance roles: admin, reporter, investigator'))

        # 2. Mock Data Configuration
        DEPARTMENTS = ['Logistics', 'Production', 'Maintenance', 'Quality Assurance', 'Fleet Management', 'Facility Operations']
        LOCATIONS = ['Warehouse A', 'Production Line 3', 'External Yard', 'Loading Dock 2', 'Chemical Storage', 'Office Hub']
        
        TITLES = [
            'Forklift Near-Collision in Loading Bay',
            'Slippery Floor near Water Fountain',
            'Improper PPE usage during welding',
            'Chemical leakage in Zone B',
            'Power outage causing equipment stall',
            'Cracked ladder found in maintenance room',
            'Blocked fire exit in logistics hub',
            'Trip hazard due to loose cabling',
            'Noise levels exceeding 85dB threshold',
            'Broken handrail on main staircase'
        ]

        # 3. Create 15 Mock Incidents
        for i in range(15):
            incident_date = timezone.now() - timedelta(days=random.randint(1, 45))
            severity = random.choice(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
            status = random.choice(['SUBMITTED', 'UNDER_INVESTIGATION', 'VALIDATED', 'CLOSED'])
            
            incident = Incident.objects.create(
                title=f"{random.choice(TITLES)} #{i+1}",
                description="This is a generated mock incident report for audit simulation and system performance testing. It includes standard industrial risk variables.",
                incident_type=random.choice(['ACCIDENT', 'NEAR_MISS', 'UNSAFE_CONDITION']),
                severity=severity,
                status=status,
                location=random.choice(LOCATIONS),
                department=random.choice(DEPARTMENTS),
                reporter=reporter,
                assigned_to=investigator if status != 'SUBMITTED' else None,
                incident_date=incident_date,
                work_hours_lost=random.choice([0, 0, 4, 8, 12]) if severity in ['HIGH', 'CRITICAL'] else 0,
                days_lost=random.choice([0, 0, 1, 2]) if severity == 'CRITICAL' else 0,
                root_cause_category=random.choice(['HUMAN_ERROR', 'PROCESS_GAP', 'EQUIPMENT_FAILURE', 'MANAGEMENT_FAILURE']) if status in ['VALIDATED', 'CLOSED'] else '',
                root_cause_description="Root cause identified as inadequate lubrication protocol resulting in overheating of primary motor assembly." if status in ['VALIDATED', 'CLOSED'] else '',
                estimated_cost=random.randint(500, 5000) if severity in ['HIGH', 'CRITICAL'] else 0
            )

            # 4. Create CAPAs for some incidents
            if status in ['UNDER_INVESTIGATION', 'VALIDATED', 'CLOSED']:
                num_capas = random.randint(1, 2)
                for j in range(num_capas):
                    CAPA.objects.create(
                        incident=incident,
                        title=f"Corrective Action: {incident.title}",
                        description="Implement immediate containment and long-term mitigation protocol to prevent recurrence of identified risk factor.",
                        action_type=random.choice(['CORRECTIVE', 'PREVENTIVE']),
                        control_hierarchy=random.choice(['ELIMINATION', 'ENGINEERING', 'ADMINISTRATIVE', 'PPE']),
                        responsible_person=investigator,
                        due_date=(timezone.now() + timedelta(days=random.randint(7, 30))).date(),
                        priority=random.randint(1, 4),
                        status=random.choice(['OPEN', 'IN_PROGRESS', 'COMPLETED']) if status != 'CLOSED' else 'CLOSED',
                        created_by=admin
                    )

        self.stdout.write(self.style.SUCCESS('🎊 Mock HSE Dataset Generated Successfully!'))
        self.stdout.write('Registry, Risk Matrix, and Analytics now populated for full system validation.')
