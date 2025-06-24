import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/timezone.dart' as tz;

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

const String channelId = 'medication_channel';

class Medication {
  String id;
  String name;
  String dosage;
  int frequencyHours;
  bool taken;

  Medication({
    required this.id,
    required this.name,
    required this.dosage,
    required this.frequencyHours,
    this.taken = false,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'dosage': dosage,
        'frequencyHours': frequencyHours,
        'taken': taken,
      };

  static Medication fromJson(Map<String, dynamic> json) => Medication(
        id: json['id'],
        name: json['name'],
        dosage: json['dosage'],
        frequencyHours: json['frequencyHours'],
        taken: json['taken'],
      );
}

class MedicationsPage extends StatefulWidget {
  const MedicationsPage({super.key});

  @override
  State<MedicationsPage> createState() => _MedicationsPageState();
}

class _MedicationsPageState extends State<MedicationsPage> {
  List<Medication> medications = [];
  late SharedPreferences prefs;

  @override
  void initState() {
    super.initState();
    _loadMedications();
  }

  Future<void> _loadMedications() async {
    prefs = await SharedPreferences.getInstance();
    final medsJson = prefs.getString('medications');
    if (medsJson != null) {
      final List<dynamic> list = jsonDecode(medsJson);
      medications = list.map((e) => Medication.fromJson(e)).toList();
      setState(() {});
      await rescheduleAll();
    }
  }

  Future<void> _saveMedications() async {
    final String medsJson =
        jsonEncode(medications.map((e) => e.toJson()).toList());
    await prefs.setString('medications', medsJson);
  }

  Future<void> scheduleNotification(Medication med, {tz.TZDateTime? scheduledTime}) async {
    final now = tz.TZDateTime.now(tz.local);
    final notifyTime = scheduledTime ?? now.add(const Duration(seconds: 5));

    await flutterLocalNotificationsPlugin.zonedSchedule(
      med.id.hashCode,
      'Hora do medicamento',
      '${med.name} - ${med.dosage}',
      notifyTime,
      NotificationDetails(
        android: AndroidNotificationDetails(
          channelId,
          'Medicações',
          channelDescription: 'Notificações de medicamentos',
          importance: Importance.max,
          priority: Priority.high,
          playSound: true,
          enableVibration: true,
          vibrationPattern: Int64List.fromList([0, 1000, 500, 1000]),
          visibility: NotificationVisibility.public,
        ),
      ),
      // Removido androidAllowWhileIdle e UILocalNotificationDateInterpretation
      uiLocalNotificationDateInterpretation:
          null,
      payload: med.id,
    );
  }

  Future<void> cancelNotification(Medication med) async {
    await flutterLocalNotificationsPlugin.cancel(med.id.hashCode);
  }

  Future<void> rescheduleNext(Medication med) async {
    final nextTime = tz.TZDateTime.now(tz.local).add(Duration(hours: med.frequencyHours));
    await scheduleNotification(med, scheduledTime: nextTime);
    print('Próxima notificação de ${med.name} agendada para $nextTime');
  }

  Future<void> rescheduleAll() async {
    for (var med in medications) {
      if (!med.taken) {
        await scheduleNotification(med);
      }
    }
  }

  void markAsTaken(Medication med) async {
    setState(() {
      med.taken = true;
    });
    await cancelNotification(med);
    await _saveMedications();
  }

  Future<bool?> _confirmDelete(Medication med) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Excluir medicamento?'),
        content: Text('Deseja realmente excluir "${med.name}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Excluir')),
        ],
      ),
    );
    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Medicações'),
        actions: [
          IconButton(
              onPressed: () => _showEditDialog(),
              icon: const Icon(Icons.add))
        ],
      ),
      body: ListView.builder(
        itemCount: medications.length,
        itemBuilder: (context, index) {
          final med = medications[index];
          return Dismissible(
            key: Key(med.id),
            background: Container(
                color: Colors.red,
                alignment: Alignment.centerLeft,
                padding: const EdgeInsets.only(left: 20),
                child: const Icon(Icons.delete, color: Colors.white)),
            secondaryBackground: Container(
                color: Colors.red,
                alignment: Alignment.centerRight,
                padding: const EdgeInsets.only(right: 20),
                child: const Icon(Icons.delete, color: Colors.white)),
            confirmDismiss: (_) => _confirmDelete(med),
            child: ListTile(
              title: Text(med.name),
              subtitle: Text('Dosagem: ${med.dosage}\nFrequência: a cada ${med.frequencyHours}h'),
              trailing: IconButton(
                icon: Icon(med.taken
                    ? Icons.check_circle
                    : Icons.radio_button_unchecked,
                    color: med.taken ? Colors.green : null),
                onPressed: () => markAsTaken(med),
                tooltip: 'Marcar como tomado',
              ),
              onTap: () => _showEditDialog(med: med),
            ),
          );
        },
      ),
    );
  }

  Future<void> _showEditDialog({Medication? med}) async {
    final TextEditingController nameController =
        TextEditingController(text: med?.name ?? '');
    final TextEditingController dosageController =
        TextEditingController(text: med?.dosage ?? '');
    final TextEditingController freqController = TextEditingController(
        text: med != null ? med.frequencyHours.toString() : '24');

    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(med == null ? 'Novo medicamento' : 'Editar medicamento'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'Nome'),
            ),
            TextField(
              controller: dosageController,
              decoration: const InputDecoration(labelText: 'Dosagem'),
            ),
            TextField(
              controller: freqController,
              keyboardType: TextInputType.number,
              decoration:
                  const InputDecoration(labelText: 'Frequência (horas)'),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          ElevatedButton(
              onPressed: () async {
                final String name = nameController.text.trim();
                final String dosage = dosageController.text.trim();
                final int? freq = int.tryParse(freqController.text.trim());

                if (name.isEmpty || dosage.isEmpty || freq == null || freq <= 0) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                      content: Text('Preencha todos os campos corretamente')));
                  return;
                }

                if (med == null) {
                  final newMed = Medication(
                    id: DateTime.now().millisecondsSinceEpoch.toString(),
                    name: name,
                    dosage: dosage,
                    frequencyHours: freq,
                    taken: false,
                  );
                  setState(() {
                    medications.add(newMed);
                  });
                  await scheduleNotification(newMed);
                } else {
                  await cancelNotification(med);
                  setState(() {
                    med.name = name;
                    med.dosage = dosage;
                    med.frequencyHours = freq;
                    med.taken = false;
                  });
                  await scheduleNotification(med);
                }
                await _saveMedications();
                Navigator.pop(context);
              },
              child: const Text('Salvar')),
        ],
      ),
    );
  }
}
