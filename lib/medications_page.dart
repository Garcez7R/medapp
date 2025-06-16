import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

class MedicationsPage extends StatefulWidget {
  @override
  _MedicationsPageState createState() => _MedicationsPageState();
}

class _MedicationsPageState extends State<MedicationsPage> {
  late FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin;

  @override
  void initState() {
    super.initState();

    // Inicializa a timezone
    tz.initializeTimeZones();

    // Configuração inicial do plugin
    flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidInit);

    flutterLocalNotificationsPlugin.initialize(initSettings);
  }

  tz.TZDateTime _nextInstanceOfTime(String timeStr) {
    final parts = timeStr.split(':');
    final hour = int.parse(parts[0]);
    final minute = int.parse(parts[1]);

    final now = tz.TZDateTime.now(tz.local);
    var scheduledDate = tz.TZDateTime(tz.local, now.year, now.month, now.day, hour, minute);

    if (scheduledDate.isBefore(now)) {
      scheduledDate = scheduledDate.add(const Duration(days: 1));
    }
    return scheduledDate;
  }

  Future<void> scheduleNotification(int id, String title, String body, String timeStr) async {
    final androidPlugin = flutterLocalNotificationsPlugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    final granted = await androidPlugin?.requestExactAlarmsPermission();
    if (granted != true) {
      print('⚠️ Permissão para alarmes exatos não concedida.');
      return;
    }

    final scheduledDate = _nextInstanceOfTime(timeStr);

    const androidDetails = AndroidNotificationDetails(
      'medications_channel_id',
      'Medications Notifications',
      channelDescription: 'Canal para notificações de medicações',
      importance: Importance.max,
      priority: Priority.high,
    );

    const platformDetails = NotificationDetails(android: androidDetails);

    await flutterLocalNotificationsPlugin.zonedSchedule(
      id,
      title,
      body,
      scheduledDate,
      platformDetails,
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Medicações')),
      body: Center(
        child: ElevatedButton(
          onPressed: () {
            scheduleNotification(
              0,
              'Hora de tomar o remédio',
              'Dose recomendada: 1 comprimido',
              '14:30',
            );
          },
          child: const Text('Agendar Notificação'),
        ),
      ),
    );
  }
}
