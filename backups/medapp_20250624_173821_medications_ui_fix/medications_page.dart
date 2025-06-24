// 👇 Aqui vai o conteúdo completo corrigido do medications_page.dart

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
  DateTime? startDate;
  TimeOfDay? startTime;
  int? durationDays;
  bool taken;

  Medication({
    required this.id,
    required this.name,
    required this.dosage,
    required this.frequencyHours,
    this.startDate,
    this.startTime,
    this.durationDays,
    this.taken = false,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'dosage': dosage,
        'frequencyHours': frequencyHours,
        'startDate': startDate?.toIso8601String(),
        'startTime': startTime != null ? '${startTime!.hour}:${startTime!.minute}' : null,
        'durationDays': durationDays,
        'taken': taken,
      };

  static Medication fromJson(Map<String, dynamic> json) {
    TimeOfDay? time;
    if (json['startTime'] != null) {
      final parts = (json['startTime'] as String).split(':');
      time = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
    }
    return Medication(
      id: json['id'],
      name: json['name'],
      dosage: json['dosage'],
      frequencyHours: json['frequencyHours'],
      startDate: json['startDate'] != null ? DateTime.parse(json['startDate']) : null,
      startTime: time,
      durationDays: json['durationDays'],
      taken: json['taken'] ?? false,
    );
  }
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
    _initNotifications();
    _loadMedications();
  }

  Future<void> _initNotifications() async {
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings();
    const settings = InitializationSettings(android: android, iOS: ios);
    await flutterLocalNotificationsPlugin.initialize(settings);
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
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      payload: med.id,
    );
  }

  Future<void> cancelNotification(Medication med) async {
    await flutterLocalNotificationsPlugin.cancel(med.id.hashCode);
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
    if (result == true) {
      setState(() {
        medications.removeWhere((element) => element.id == med.id);
      });
      await cancelNotification(med);
      await _saveMedications();
      return true;
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Center(child: Text('Meus Medicamentos')),
      ),
      body: medications.isEmpty
          ? const Center(
              child: Text('Nenhuma medicação cadastrada. Clique no + para adicionar.'),
            )
          : ListView.builder(
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
                    subtitle: Text('Dosagem: ${med.dosage}\nFrequência: ${med.frequencyHours}h'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: Icon(med.taken ? Icons.check_circle : Icons.radio_button_unchecked),
                          onPressed: () => markAsTaken(med),
                          tooltip: 'Marcar como tomado',
                        ),
                        IconButton(
                          icon: const Icon(Icons.edit),
                          onPressed: () => _showEditDialog(med: med),
                          tooltip: 'Editar',
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showEditDialog(),
        tooltip: 'Adicionar medicamento',
        child: const Icon(Icons.add),
      ),
    );
  }

  Future<void> _showEditDialog({Medication? med}) async {
    final nameController = TextEditingController(text: med?.name ?? '');
    final dosageController = TextEditingController(text: med?.dosage ?? '');
    final freqController = TextEditingController(text: med?.frequencyHours.toString() ?? '24');
    final durationController = TextEditingController(text: med?.durationDays?.toString() ?? '');

    DateTime selectedDate = med?.startDate ?? DateTime.now();
    TimeOfDay selectedTime = med?.startTime ?? TimeOfDay.now();

    await showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(med == null ? 'Novo Medicamento' : 'Editar Medicamento'),
        content: SingleChildScrollView(
          child: Column(
            children: [
              TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Nome')),
              TextField(controller: dosageController, decoration: const InputDecoration(labelText: 'Dosagem')),
              TextField(controller: freqController, decoration: const InputDecoration(labelText: 'Frequência (h)')),
              TextField(controller: durationController, decoration: const InputDecoration(labelText: 'Duração (dias)')),
              const SizedBox(height: 10),
              const Text('Início:'),
              Row(
                children: [
                  TextButton(
                    onPressed: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: selectedDate,
                        firstDate: DateTime(2000),
                        lastDate: DateTime(2100),
                      );
                      if (picked != null) selectedDate = picked;
                    },
                    child: Text('${selectedDate.day}/${selectedDate.month}/${selectedDate.year}'),
                  ),
                  const SizedBox(width: 10),
                  TextButton(
                    onPressed: () async {
                      final picked = await showTimePicker(
                        context: context,
                        initialTime: selectedTime,
                      );
                      if (picked != null) selectedTime = picked;
                    },
                    child: Text('${selectedTime.format(context)}'),
                  ),
                ],
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () async {
              final medData = Medication(
                id: med?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
                name: nameController.text,
                dosage: dosageController.text,
                frequencyHours: int.tryParse(freqController.text) ?? 24,
                startDate: selectedDate,
                startTime: selectedTime,
                durationDays: int.tryParse(durationController.text),
              );
              setState(() {
                if (med == null) {
                  medications.add(medData);
                } else {
                  medications[medications.indexOf(med)] = medData;
                }
              });
              await scheduleNotification(medData);
              await _saveMedications();
              Navigator.pop(context);
            },
            child: const Text('Salvar'),
          )
        ],
      ),
    );
  }
}
