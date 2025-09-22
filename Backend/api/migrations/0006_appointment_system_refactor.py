# Generated manually for appointment system refactor

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0005_action_actiontemplate_actionsession_actionsample'),
    ]

    operations = [
        # 创建新的AvailabilitySlot模型
        migrations.CreateModel(
            name='AvailabilitySlot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_at', models.DateTimeField()),
                ('end_at', models.DateTimeField()),
                ('buffer_min', models.IntegerField(default=0, help_text='Buffer time in minutes')),
                ('status', models.CharField(choices=[('open', 'Open'), ('closed', 'Closed')], default='open', max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('therapist_id', models.ForeignKey(limit_choices_to={'role': 'therapist'}, on_delete=django.db.models.deletion.CASCADE, related_name='availability_slots', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['start_at'],
            },
        ),
        
        # 添加索引
        migrations.AddIndex(
            model_name='availabilityslot',
            index=models.Index(fields=['therapist_id', 'start_at'], name='api_availab_therapist_2b8c8a_idx'),
        ),
        
        # 修改Appointment模型
        migrations.RenameField(
            model_name='appointment',
            old_name='appointmentId',
            new_name='appointment_code',
        ),
        migrations.RenameField(
            model_name='appointment',
            old_name='patientId',
            new_name='patient_id',
        ),
        migrations.RenameField(
            model_name='appointment',
            old_name='therapistId',
            new_name='therapist_id',
        ),
        migrations.RenameField(
            model_name='appointment',
            old_name='appointmentDateTime',
            new_name='start_at',
        ),
        migrations.RenameField(
            model_name='appointment',
            old_name='duration',
            new_name='duration_min',
        ),
        migrations.RenameField(
            model_name='appointment',
            old_name='creationDate',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='appointment',
            old_name='sessionNotes',
            new_name='session_notes',
        ),
        
        # 添加新字段
        migrations.AddField(
            model_name='appointment',
            name='end_at',
            field=models.DateTimeField(default='2025-01-01T00:00:00Z'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='appointment',
            name='contact_name',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='appointment',
            name='contact_phone',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='appointment',
            name='mode',
            field=models.CharField(choices=[('onsite', 'On-site'), ('tele', 'Telemedicine'), ('home', 'Home visit')], default='onsite', max_length=10),
        ),
        migrations.AddField(
            model_name='appointment',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        
        # 修改patient_id为可选
        migrations.AlterField(
            model_name='appointment',
            name='patient_id',
            field=models.ForeignKey(blank=True, limit_choices_to={'role': 'patient'}, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='patient_appointments', to=settings.AUTH_USER_MODEL),
        ),
        
        # 添加索引
        migrations.AddIndex(
            model_name='appointment',
            index=models.Index(fields=['therapist_id', 'start_at'], name='api_appoint_therapist_4a8c8a_idx'),
        ),
        migrations.AddIndex(
            model_name='appointment',
            index=models.Index(fields=['patient_id', 'start_at'], name='api_appoint_patient_5a8c8a_idx'),
        ),
        
        # 添加唯一约束
        migrations.AddConstraint(
            model_name='appointment',
            constraint=models.UniqueConstraint(fields=['appointment_code'], name='unique_appointment_code'),
        ),
    ]
