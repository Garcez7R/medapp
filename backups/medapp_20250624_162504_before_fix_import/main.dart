import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;
import 'lib/pages/medications_page.dart';

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

const String channelId = 'medication_channel';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  tz.initializeTimeZones();
  final String timeZoneName = await tz.Timezone.getLocalTimezone();
  tz.setLocalLocation(tz.getLocation(timeZoneName));

  const AndroidInitializationSettings initializationSettingsAndroid =
      AndroidInitializationSettings('@mipmap/ic_launcher');

  final InitializationSettings initializationSettings = InitializationSettings(
    android: initializationSettingsAndroid,
  );

  // Configura callback para saber quando notificação é acionada
  await flutterLocalNotificationsPlugin.initialize(
    initializationSettings,
    onDidReceiveNotificationResponse: (NotificationResponse response) {
      // Você pode processar clique na notificação aqui, se quiser
      print('Notificação recebida: ${response.payload}');
    },
  );

  final AndroidNotificationChannel channel = AndroidNotificationChannel(
    channelId,
    'Medicações',
    description: 'Notificações de medicamentos',
    importance: Importance.max,
    playSound: true,
    enableVibration: true,
  );

  await flutterLocalNotificationsPlugin
      .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(channel);

  runApp(const MaterialApp(home: MedicationsPage()));
}
