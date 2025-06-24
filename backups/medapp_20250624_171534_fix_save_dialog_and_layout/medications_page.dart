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
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      payload: med.id,
    );
  }

  Future<void> cancelNotification(Medication med) async {
    await flutterLocalNotificationsPlugin.cancel(med.id.hashCode);
  }

  Future<void> rescheduleNext(Medication med) async {
    final nextTime = tz.TZDateTime.now(tz.local).add(Duration(hours: med.frequencyHours));
    await scheduleNotification(med, scheduledTime: nextTime);
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
        title: const Text('Meus Medicamentos'),
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
                    subtitle: Text('Dosagem: ${med.dosage}\nFrequência: a cada ${med.frequencyHours}h'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: Icon(med.taken
                              ? Icons.check_circle
                              : Icons.radio_button_unchecked,
                              color: med.taken ? Colors.green : null),
                          onPressed: () => markAsTaken(med),
                          tooltip: 'Marcar como tomado',
                        ),
                        IconButton(
                          icon: const Icon(Icons.edit),
                          onPressed: () => _showEditDialog(med: med),
                          tooltip: 'Editar medicamento',
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showEditDialog(),
        tooltip: 'Adicionar medicação',
        child: const Icon(Icons.add),
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
    final TextEditingController durationController = TextEditingController(
        text: med != null && med.durationDays != null
            ? med.durationDays.toString()
            : '');

    DateTime selectedDate = med?.startDate ?? DateTime.now();
    TimeOfDay selectedTime = med?.startTime ?? TimeOfDay.now();

    await showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setStateDialog) => AlertDialog(
          title: Text(med == null ? 'Novo medicamento' : 'Editar medicamento'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
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
                  decoration: const InputDecoration(labelText: 'Frequência (horas)'),
                ),
                const SizedBox(height: 10),
                Text('Início:'),
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
                        if (picked != null) {
                          setStateDialog(() {
                            selectedDate = picked;
                          });
                        }
                      },
                      child: Text(
                          '${selectedDate.day}/${selectedDate.month}/${selectedDate.year}'),
                    ),
                    const SizedBox(width: 10),
                    TextButton(
                      onPressed: () async {
                        final picked = await showTimePicker(
                          context: context,
                          initialTime: selectedTime,
                        );
                        if (picked != null) {
                          setStateDialog(() {
                            selectedTime = picked;
                          });
                        }
                      },
                      child: Text('${selectedTime.format(context)}'),
                    ),
                  ],
                ),
                TextField(
                  controller: durationController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Duração (dias) - deixe vazio para indefinido',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancelar')),
            ElevatedButton(
                onPressed: () async {
                  final String name = nameController.text.trim();
                  final String dosage = dosageController.text.trim();
                  final int? freq = int.tryParse(freqController.text.trim());
                  final int? duration = durationController.text.trim().isEmpty
                      ? null
                      : int.tryParse(durationController.text.trim());

                  if (name.isEmpty || dosage.isEmpty || freq == null || freq <= 0) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                        content: Text('Preencha todos os campos corretamente')));
                    return;
                  }

                  DateTime startDateTime = DateTime(
                      selectedDate.year,
                      selectedDate.month,
                      selectedDate.day,
                      selectedTime.hour,
                      selectedTime.minute);

                  if (med == null) {
                    final newMed = Medication(
                      id: DateTime.now().millisecondsSinceEpoch.toString(),
                      name: name,
                      dosage: dosage,
                      frequencyHours: freq,
                      startDate: startDateTime,
                      startTime: selectedTime,
                      durationDays: duration,
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
                      med.startDate = startDateTime;
                      med.startTime = selectedTime;
                      med.durationDays = duration;
                      med.taken = false;
                    });
                    await scheduleNotification(med);
                  }
                  await _saveMedications();
                  Navigator.pop(context); // Fecha diálogo ao salvar
                },
                child: const Text('Salvar')),
          ],
        ),
      ),
    );
  }
}
