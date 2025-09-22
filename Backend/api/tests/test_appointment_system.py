"""
预约系统测试用例
"""
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from datetime import datetime, timedelta
from rest_framework.test import APITestCase
from rest_framework import status
from api.models import CustomUser, Appointment, AvailabilitySlot


class AppointmentSystemTestCase(APITestCase):
    def setUp(self):
        """设置测试数据"""
        # 创建治疗师
        self.therapist = CustomUser.objects.create_user(
            id='T0001',
            username='test_therapist',
            email='therapist@test.com',
            password='testpass123',
            role='therapist'
        )
        
        # 创建患者
        self.patient = CustomUser.objects.create_user(
            id='P0001',
            username='test_patient',
            email='patient@test.com',
            password='testpass123',
            role='patient'
        )
        
        # 创建另一个患者
        self.patient2 = CustomUser.objects.create_user(
            id='P0002',
            username='test_patient2',
            email='patient2@test.com',
            password='testpass123',
            role='patient'
        )

    def test_create_appointment_with_existing_patient(self):
        """测试创建已有患者的预约"""
        start_time = timezone.now() + timedelta(days=1)
        start_time_str = start_time.isoformat()
        
        data = {
            'therapist_id': self.therapist.id,
            'patient_id': self.patient.id,
            'start_at': start_time_str,
            'duration_min': 60,
            'mode': 'onsite',
            'notes': 'Test appointment'
        }
        
        response = self.client.post('/api/appointments/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Appointment.objects.count(), 1)
        
        appointment = Appointment.objects.first()
        self.assertEqual(appointment.therapist_id, self.therapist)
        self.assertEqual(appointment.patient_id, self.patient)
        self.assertEqual(appointment.duration_min, 60)
        self.assertEqual(appointment.mode, 'onsite')
        self.assertEqual(appointment.status, 'Scheduled')
        self.assertTrue(appointment.appointment_code.startswith('APT-'))

    def test_create_appointment_with_new_patient_placeholder(self):
        """测试创建新患者占位预约"""
        start_time = timezone.now() + timedelta(days=1)
        start_time_str = start_time.isoformat()
        
        data = {
            'therapist_id': self.therapist.id,
            'contact_name': 'New Patient',
            'contact_phone': '012-3456789',
            'start_at': start_time_str,
            'duration_min': 45,
            'mode': 'onsite',
            'notes': 'New patient placeholder'
        }
        
        response = self.client.post('/api/appointments/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Appointment.objects.count(), 1)
        
        appointment = Appointment.objects.first()
        self.assertEqual(appointment.therapist_id, self.therapist)
        self.assertIsNone(appointment.patient_id)
        self.assertEqual(appointment.contact_name, 'New Patient')
        self.assertEqual(appointment.contact_phone, '012-3456789')
        self.assertEqual(appointment.status, 'Scheduled')

    def test_appointment_time_conflict_detection(self):
        """测试预约时间冲突检测"""
        start_time = timezone.now() + timedelta(days=1)
        start_time_str = start_time.isoformat()
        
        # 创建第一个预约
        data1 = {
            'therapist_id': self.therapist.id,
            'patient_id': self.patient.id,
            'start_at': start_time_str,
            'duration_min': 60,
            'mode': 'onsite'
        }
        
        response1 = self.client.post('/api/appointments/', data1, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # 尝试创建冲突的预约
        conflict_time = start_time + timedelta(minutes=30)  # 30分钟后开始，但第一个预约60分钟
        data2 = {
            'therapist_id': self.therapist.id,
            'patient_id': self.patient2.id,
            'start_at': conflict_time.isoformat(),
            'duration_min': 30,
            'mode': 'onsite'
        }
        
        response2 = self.client.post('/api/appointments/', data2, format='json')
        self.assertEqual(response2.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('Time slot unavailable', response2.data['error'])

    def test_appointment_status_update_complete(self):
        """测试预约状态更新为完成"""
        # 创建预约
        appointment = Appointment.objects.create(
            therapist_id=self.therapist,
            patient_id=self.patient,
            start_at=timezone.now() + timedelta(days=1),
            end_at=timezone.now() + timedelta(days=1, hours=1),
            duration_min=60,
            status='Scheduled'
        )
        
        data = {'action': 'complete'}
        response = self.client.patch(f'/api/appointments/{appointment.appointment_code}/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, 'Completed')

    def test_appointment_status_update_cancel(self):
        """测试预约状态更新为取消"""
        # 创建预约
        appointment = Appointment.objects.create(
            therapist_id=self.therapist,
            patient_id=self.patient,
            start_at=timezone.now() + timedelta(days=1),
            end_at=timezone.now() + timedelta(days=1, hours=1),
            duration_min=60,
            status='Scheduled'
        )
        
        data = {'action': 'cancel'}
        response = self.client.patch(f'/api/appointments/{appointment.appointment_code}/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, 'Cancelled')

    def test_bind_patient_to_placeholder_appointment(self):
        """测试将患者绑定到占位预约"""
        # 创建占位预约
        appointment = Appointment.objects.create(
            therapist_id=self.therapist,
            patient_id=None,
            contact_name='New Patient',
            contact_phone='012-3456789',
            start_at=timezone.now() + timedelta(days=1),
            end_at=timezone.now() + timedelta(days=1, hours=1),
            duration_min=60,
            status='Scheduled'
        )
        
        data = {
            'action': 'bind_patient',
            'patient_id': self.patient.id
        }
        response = self.client.patch(f'/api/appointments/{appointment.appointment_code}/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        appointment.refresh_from_db()
        self.assertEqual(appointment.patient_id, self.patient)
        self.assertIsNone(appointment.contact_name)
        self.assertIsNone(appointment.contact_phone)

    def test_list_appointments_for_therapist(self):
        """测试获取治疗师的预约列表"""
        # 创建预约
        appointment = Appointment.objects.create(
            therapist_id=self.therapist,
            patient_id=self.patient,
            start_at=timezone.now() + timedelta(days=1),
            end_at=timezone.now() + timedelta(days=1, hours=1),
            duration_min=60,
            status='Scheduled'
        )
        
        response = self.client.get(f'/api/appointments/list/?scope=therapist&user_id={self.therapist.id}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['appointments']), 1)
        self.assertEqual(response.data['appointments'][0]['id'], appointment.id)

    def test_list_appointments_for_patient(self):
        """测试获取患者的预约列表"""
        # 创建预约
        appointment = Appointment.objects.create(
            therapist_id=self.therapist,
            patient_id=self.patient,
            start_at=timezone.now() + timedelta(days=1),
            end_at=timezone.now() + timedelta(days=1, hours=1),
            duration_min=60,
            status='Scheduled'
        )
        
        response = self.client.get(f'/api/appointments/list/?scope=patient&user_id={self.patient.id}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['appointments']), 1)
        self.assertEqual(response.data['appointments'][0]['id'], appointment.id)

    def test_create_availability_slot(self):
        """测试创建可用时间槽"""
        start_time = timezone.now() + timedelta(days=1)
        end_time = start_time + timedelta(hours=8)
        
        data = {
            'therapist_id': self.therapist.id,
            'start_at': start_time.isoformat(),
            'end_at': end_time.isoformat(),
            'buffer_min': 15,
            'status': 'open'
        }
        
        response = self.client.post('/api/availability/create/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AvailabilitySlot.objects.count(), 1)
        
        slot = AvailabilitySlot.objects.first()
        self.assertEqual(slot.therapist_id, self.therapist)
        self.assertEqual(slot.buffer_min, 15)
        self.assertEqual(slot.status, 'open')

    def test_get_availability_slots(self):
        """测试获取可用时间槽"""
        # 创建时间槽
        start_time = timezone.now() + timedelta(days=1)
        end_time = start_time + timedelta(hours=8)
        
        AvailabilitySlot.objects.create(
            therapist_id=self.therapist,
            start_at=start_time,
            end_at=end_time,
            buffer_min=15,
            status='open'
        )
        
        response = self.client.get(f'/api/availability/?therapist_id={self.therapist.id}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['slots']), 1)
        self.assertEqual(response.data['slots'][0]['therapist_id'], self.therapist.id)

    def test_appointment_code_generation_uniqueness(self):
        """测试预约编号生成的唯一性"""
        start_time = timezone.now() + timedelta(days=1)
        
        # 创建多个预约
        appointment1 = Appointment.objects.create(
            therapist_id=self.therapist,
            patient_id=self.patient,
            start_at=start_time,
            end_at=start_time + timedelta(hours=1),
            duration_min=60
        )
        
        appointment2 = Appointment.objects.create(
            therapist_id=self.therapist,
            patient_id=self.patient2,
            start_at=start_time + timedelta(hours=2),
            end_at=start_time + timedelta(hours=3),
            duration_min=60
        )
        
        # 验证预约编号不同
        self.assertNotEqual(appointment1.appointment_code, appointment2.appointment_code)
        
        # 验证预约编号格式
        self.assertTrue(appointment1.appointment_code.startswith('APT-'))
        self.assertTrue(appointment2.appointment_code.startswith('APT-'))

    def test_invalid_appointment_creation_missing_fields(self):
        """测试缺少必填字段时的预约创建"""
        data = {
            'therapist_id': self.therapist.id,
            # 缺少 patient_id 和 contact_name/contact_phone
        }
        
        response = self.client.post('/api/appointments/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Missing required fields', response.data['error'])

    def test_invalid_duration(self):
        """测试无效的预约时长"""
        start_time = timezone.now() + timedelta(days=1)
        
        data = {
            'therapist_id': self.therapist.id,
            'patient_id': self.patient.id,
            'start_at': start_time.isoformat(),
            'duration_min': 90,  # 无效时长
            'mode': 'onsite'
        }
        
        response = self.client.post('/api/appointments/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid duration', response.data['error'])
