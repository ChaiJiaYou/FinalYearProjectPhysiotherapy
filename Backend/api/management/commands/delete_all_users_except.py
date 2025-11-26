"""
Django management command to delete all users except A0001
Usage: python manage.py delete_all_users_except
"""
from django.core.management.base import BaseCommand
from api.models import (
    CustomUser, Admin, Therapist, Patient, Appointment, UnavailableSlot,
    MedicalHistory, Notification, Exercise, Treatment, TreatmentExercise, ExerciseRecord
)
from django.db import transaction, connection


class Command(BaseCommand):
    help = 'Delete all users except A0001'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Skip confirmation prompt',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        confirm = options['confirm']
        
        # Get all users except A0001
        users_to_delete = CustomUser.objects.exclude(id='A0001')
        user_count = users_to_delete.count()
        
        if user_count == 0:
            self.stdout.write(
                self.style.SUCCESS('No users to delete. Only A0001 exists.')
            )
            return
        
        # Show users that will be deleted
        self.stdout.write(
            self.style.WARNING(f'\nFound {user_count} user(s) to delete:')
        )
        for user in users_to_delete:
            self.stdout.write(f'  - {user.id}: {user.username} ({user.role})')
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('\n[DRY RUN] No users were actually deleted.')
            )
            return
        
        # Confirmation
        if not confirm:
            self.stdout.write(
                self.style.WARNING(
                    f'\n⚠️  WARNING: This will delete {user_count} user(s) and all related data!'
                )
            )
            self.stdout.write(
                self.style.WARNING(
                    'This includes: appointments, treatments, exercise records, notifications, etc.'
                )
            )
            response = input('\nAre you sure you want to continue? (yes/no): ')
            if response.lower() not in ['yes', 'y']:
                self.stdout.write(self.style.ERROR('Operation cancelled.'))
                return
        
        # Delete users using raw SQL to avoid ManyToMany relationship issues
        try:
            # Get user IDs to delete
            user_ids = list(users_to_delete.values_list('id', flat=True))
            
            if not user_ids:
                self.stdout.write(self.style.SUCCESS('No users to delete.'))
                return
            
            cursor = connection.cursor()
            deleted_counts = {}
            
            # Helper function to execute SQL with error handling
            def safe_execute(sql, params, description):
                try:
                    cursor.execute(sql, params)
                    return cursor.rowcount
                except Exception as e:
                    # Check if it's a transaction error
                    if 'current transaction is aborted' in str(e).lower():
                        # Rollback and retry
                        connection.rollback()
                        try:
                            cursor.execute(sql, params)
                            return cursor.rowcount
                        except Exception as e2:
                            self.stdout.write(
                                self.style.WARNING(f'  Warning: {description} failed: {str(e2)}')
                            )
                            return 0
                    else:
                        self.stdout.write(
                            self.style.WARNING(f'  Warning: {description} failed: {str(e)}')
                        )
                        return 0
            
            # Delete in correct order to respect foreign key constraints
            # Note: Django ForeignKey fields in database are named as "field_name_id"
            
            # 1. ExerciseRecord (depends on TreatmentExercise and patient_id)
            count = safe_execute(
                "DELETE FROM api_exerciserecord WHERE patient_id_id = ANY(%s)",
                [user_ids],
                "Delete ExerciseRecord"
            )
            deleted_counts['ExerciseRecord'] = count
            if count > 0:
                self.stdout.write(f'  Deleted {count} ExerciseRecord(s)')
            
            # 2. TreatmentExercise will be deleted when Treatment is deleted (CASCADE)
            # But we need to delete ExerciseRecords first (already done above)
            
            # 3. Treatment (depends on patient_id and therapist_id)
            count = safe_execute(
                "DELETE FROM api_treatment WHERE patient_id_id = ANY(%s) OR therapist_id_id = ANY(%s)",
                [user_ids, user_ids],
                "Delete Treatment"
            )
            deleted_counts['Treatment'] = count
            if count > 0:
                self.stdout.write(f'  Deleted {count} Treatment(s)')
            # TreatmentExercise will be automatically deleted via CASCADE
            
            # 4. Exercise (depends on created_by)
            count = safe_execute(
                "DELETE FROM api_exercise WHERE created_by_id = ANY(%s)",
                [user_ids],
                "Delete Exercise"
            )
            deleted_counts['Exercise'] = count
            if count > 0:
                self.stdout.write(f'  Deleted {count} Exercise(s)')
            
            # 5. Notification (depends on user)
            count = safe_execute(
                "DELETE FROM api_notification WHERE user_id = ANY(%s)",
                [user_ids],
                "Delete Notification"
            )
            deleted_counts['Notification'] = count
            if count > 0:
                self.stdout.write(f'  Deleted {count} Notification(s)')
            
            # 6. MedicalHistory (depends on patient_id)
            count = safe_execute(
                "DELETE FROM api_medicalhistory WHERE patient_id_id = ANY(%s)",
                [user_ids],
                "Delete MedicalHistory"
            )
            deleted_counts['MedicalHistory'] = count
            if count > 0:
                self.stdout.write(f'  Deleted {count} MedicalHistory record(s)')
            
            # 7. UnavailableSlot (depends on therapist_id)
            count = safe_execute(
                "DELETE FROM api_unavailableslot WHERE therapist_id_id = ANY(%s)",
                [user_ids],
                "Delete UnavailableSlot"
            )
            deleted_counts['UnavailableSlot'] = count
            if count > 0:
                self.stdout.write(f'  Deleted {count} UnavailableSlot(s)')
            
            # 8. Appointment (depends on therapist_id and patient_id)
            count = safe_execute(
                "DELETE FROM api_appointment WHERE therapist_id_id = ANY(%s) OR patient_id_id = ANY(%s)",
                [user_ids, user_ids],
                "Delete Appointment"
            )
            deleted_counts['Appointment'] = count
            if count > 0:
                self.stdout.write(f'  Deleted {count} Appointment(s)')
            
            # 9. Role-specific tables (Admin, Therapist, Patient)
            # OneToOneField uses "user_id" as column name
            count = safe_execute(
                "DELETE FROM api_admin WHERE user_id = ANY(%s)",
                [user_ids],
                "Delete Admin"
            )
            deleted_counts['Admin'] = count
            if count > 0:
                self.stdout.write(f'  Deleted {count} Admin profile(s)')
            
            count = safe_execute(
                "DELETE FROM api_therapist WHERE user_id = ANY(%s)",
                [user_ids],
                "Delete Therapist"
            )
            deleted_counts['Therapist'] = count
            if count > 0:
                self.stdout.write(f'  Deleted {count} Therapist profile(s)')
            
            count = safe_execute(
                "DELETE FROM api_patient WHERE user_id = ANY(%s)",
                [user_ids],
                "Delete Patient"
            )
            deleted_counts['Patient'] = count
            if count > 0:
                self.stdout.write(f'  Deleted {count} Patient profile(s)')
            
            # 10. Finally delete CustomUser records
            # First, try to clear ManyToMany relationships if tables exist
            safe_execute(
                "DELETE FROM api_customuser_groups WHERE customuser_id = ANY(%s)",
                [user_ids],
                "Delete from api_customuser_groups"
            )
            
            safe_execute(
                "DELETE FROM api_customuser_user_permissions WHERE customuser_id = ANY(%s)",
                [user_ids],
                "Delete from api_customuser_user_permissions"
            )
            
            # Update SET_NULL fields first
            safe_execute(
                "UPDATE api_customuser SET created_by_id = NULL WHERE created_by_id = ANY(%s)",
                [user_ids],
                "Update created_by_id"
            )
            
            safe_execute(
                "UPDATE api_customuser SET modified_by_id = NULL WHERE modified_by_id = ANY(%s)",
                [user_ids],
                "Update modified_by_id"
            )
            
            # Delete users
            count = safe_execute(
                "DELETE FROM api_customuser WHERE id = ANY(%s)",
                [user_ids],
                "Delete CustomUser"
            )
            deleted_counts['CustomUser'] = count
            if count > 0:
                self.stdout.write(f'  Deleted {count} CustomUser(s)')
                
                # Summary
                self.stdout.write(
                    self.style.SUCCESS(
                        f'\n✅ Successfully deleted {deleted_counts["CustomUser"]} user(s).'
                    )
                )
                self.stdout.write(
                    self.style.SUCCESS('User A0001 has been preserved.')
                )
                
                # Show summary of deleted related data
                self.stdout.write('\nSummary of deleted related data:')
                for table, count in deleted_counts.items():
                    if count > 0:
                        self.stdout.write(f'  - {table}: {count} record(s)')
                        
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'\n❌ Error occurred: {str(e)}')
            )
            import traceback
            self.stdout.write(traceback.format_exc())
            raise
