import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tz;
import 'package:timezone/timezone.dart' as tz;
import 'dart:math';
import 'dart:io';

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

class Medication {
  String name;
  String dosage;
  String frequency;
  int duration;
  TimeOfDay time;
  bool indefinite;

  Medication({
    required this.name,
    required this.dosage,
    required this.frequency,
    required this.duration,
    required this.time,
    this.indefinite = false,
  });
}

class MedicationsPage extends StatefulWidget {
  const MedicationsPage({super.key});
  @override
  State<MedicationsPage> createState() => _MedicationsPageState();
}

class _MedicationsPageState extends State<MedicationsPage> {
  List<Medication> medications = [];

  @override
  void initState() {
    super.initState();
    _initializeNotifications();
  }

  Future<void> _initializeNotifications() async {
    const AndroidInitializationSettings initializationSettingsAndroid = AndroidInitializationSettings('@mipmap/ic_launcher');
    const InitializationSettings initializationSettings = InitializationSettings(android: initializationSettingsAndroid);
    await flutterLocalNotificationsPlugin.initialize(initializationSettings);
    tz.initializeTimeZones();
  }

  Future<void> _scheduleNotification(Medication med) async {
    final scheduledDate = tz.TZDateTime.from(
      DateTime.now().add(const Duration(seconds: 10)),
      tz.local,
    );

    final androidDetails = AndroidNotificationDetails(
      'med_channel_id',
      'Medicamentos',
      channelDescription: 'Lembretes de medicação',
      importance: Importance.max,
      priority: Priority.high,
      playSound: true,
      enableVibration: true,
      sound: RawResourceAndroidNotificationSound('alerta'),
    );

    final notificationDetails = NotificationDetails(android: androidDetails);

    await flutterLocalNotificationsPlugin.zonedSchedule(
      Random().nextInt(100000),
      'Hora de tomar: ${med.name}',
      'Dosagem: ${med.dosage}',
      scheduledDate,
      notificationDetails,
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      matchDateTimeComponents: DateTimeComponents.time,
      uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
    );
  }

  void _addOrEditMedication({Medication? med}) {
    final nameController = TextEditingController(text: med?.name);
    final dosageController = TextEditingController(text: med?.dosage);
    final frequencyController = TextEditingController(text: med?.frequency);
    final durationController = TextEditingController(text: med?.duration.toString());
    TimeOfDay selectedTime = med?.time ?? TimeOfDay.now();
    bool indefinite = med?.indefinite ?? false;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(med == null ? 'Adicionar Medicamento' : 'Editar Medicamento'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Nome')),
              TextField(controller: dosageController, decoration: const InputDecoration(labelText: 'Dosagem')),
              TextField(controller: frequencyController, decoration: const InputDecoration(labelText: 'Frequência')),
              Row(
                children: [
                  const Text('Início: '),
                  TextButton(
                    child: Text('${selectedTime.format(context)}'),
                    onPressed: () async {
                      final time = await showTimePicker(context: context, initialTime: selectedTime);
                      if (time != null) {
                        setState(() => selectedTime = time);
                      }
                    },
                  ),
                ],
              ),
              Row(
                children: [
                  const Text('Duração (dias):'),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: durationController,
                      keyboardType: TextInputType.number,
                      enabled: !indefinite,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  Checkbox(
                    value: indefinite,
                    onChanged: (value) => setState(() => indefinite = value ?? false),
                  ),
                  const Expanded(child: Text('Tratamento indefinido')),
                ],
              ),
            ],
          ),
        ),
        actions: [
          if (med != null)
            TextButton(
              onPressed: () {
                setState(() => medications.remove(med));
                Navigator.pop(context);
              },
              child: const Text('Excluir'),
            ),
          TextButton(
            onPressed: () {
              final newMed = Medication(
                name: nameController.text,
                dosage: dosageController.text,
                frequency: frequencyController.text,
                duration: int.tryParse(durationController.text) ?? 0,
                time: selectedTime,
                indefinite: indefinite,
              );
              setState(() {
                if (med != null) {
                  final index = medications.indexOf(med);
                  medications[index] = newMed;
                } else {
                  medications.add(newMed);
                }
              });
              _scheduleNotification(newMed);
              Navigator.pop(context);
            },
            child: const Text('Salvar'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        centerTitle: true,
        title: const Text('Meus Medicamentos'),
      ),
      body: ListView.builder(
        itemCount: medications.length,
        itemBuilder: (context, index) {
          final med = medications[index];
          return ListTile(
            title: Text(med.name),
            subtitle: Text('${med.dosage} | ${med.frequency}'),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.edit),
                  onPressed: () => _addOrEditMedication(med: med),
                ),
                Checkbox(
                  value: false,
                  onChanged: (_) {},
                ),
              ],
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _addOrEditMedication(),
        child: const Icon(Icons.add),
      ),
    );
  }
}
