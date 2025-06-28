// ATENÇÃO: Arquivo atualizado, removido uiLocalNotificationDateInterpretation e corrigido agendamento.

import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:timezone/timezone.dart' as tz;
import 'package:permission_handler/permission_handler.dart';

class Medication {
  String name;
  String dosage;
  int frequency; // em horas
  int duration; // em dias, 0 = indefinido
  DateTime startTime;
  bool taken;

  Medication({
    required this.name,
    required this.dosage,
    required this.frequency,
    required this.duration,
    required this.startTime,
    this.taken = false,
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        'dosage': dosage,
        'frequency': frequency,
        'duration': duration,
        'startTime': startTime.toIso8601String(),
        'taken': taken,
      };

  factory Medication.fromJson(Map<String, dynamic> json) => Medication(
        name: json['name'],
        dosage: json['dosage'],
        frequency: json['frequency'],
        duration: json['duration'],
        startTime: DateTime.parse(json['startTime']),
        taken: json['taken'] ?? false,
      );
}

class MedicationsPage extends StatefulWidget {
  const MedicationsPage({super.key});

  @override
  State<MedicationsPage> createState() => _MedicationsPageState();
}

class _MedicationsPageState extends State<MedicationsPage> {
  List<Medication> medications = [];
  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  @override
  void initState() {
    super.initState();
    _initializeNotifications();
    _loadMedications();
  }

  Future<void> _initializeNotifications() async {
    const AndroidInitializationSettings androidSettings =
        AndroidInitializationSettings('ic_capsule');

    final InitializationSettings settings = InitializationSettings(
      android: androidSettings,
    );

    await flutterLocalNotificationsPlugin.initialize(settings);

    final status = await Permission.notification.request();
    if (status != PermissionStatus.granted) {
      debugPrint('Permissão de notificação negada');
    }

    // Cria canal com ícone personalizado para notificações persistentes
    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      'med_channel_persistent',
      'MedApp Notificações Persistentes',
      description: 'Notificações persistentes de medicação',
      importance: Importance.low,
      playSound: false,
      enableVibration: false,
      showBadge: false,
    );

    await flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);

    // Exibe notificação persistente (foreground)
    await flutterLocalNotificationsPlugin.show(
      0,
      'MedApp ativo',
      'O app está gerenciando suas medicações',
      NotificationDetails(
        android: AndroidNotificationDetails(
          channel.id,
          channel.name,
          channelDescription: channel.description,
          icon: 'ic_capsule',
          ongoing: true,
          priority: Priority.low,
          importance: Importance.low,
          autoCancel: false,
          onlyAlertOnce: true,
        ),
      ),
    );
  }

  Future<void> _scheduleNotification(Medication med) async {
    final now = tz.TZDateTime.now(tz.local);

    tz.TZDateTime first = tz.TZDateTime(
      tz.local,
      now.year,
      now.month,
      now.day,
      med.startTime.hour,
      med.startTime.minute,
    );

    while (first.isBefore(now)) {
      first = first.add(Duration(hours: med.frequency));
    }

    final total = med.duration == 0 ? 1000 : (24 ~/ med.frequency) * med.duration;

    for (int i = 0; i < total; i++) {
      final scheduledTime = first.add(Duration(hours: med.frequency * i));
      if (scheduledTime.isBefore(now)) continue;

      await flutterLocalNotificationsPlugin.zonedSchedule(
        med.name.hashCode + i,
        'Hora do medicamento',
        '${med.name} - ${med.dosage}',
        scheduledTime,
        NotificationDetails(
          android: AndroidNotificationDetails(
            'med_channel_persistent',
            'MedApp Notificações Persistentes',
            channelDescription: 'Notificações persistentes de medicação',
            icon: 'ic_capsule',
            importance: Importance.max,
            priority: Priority.high,
          ),
        ),
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        matchDateTimeComponents: DateTimeComponents.time,
      );
    }
  }

  Future<void> _saveMedications() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
        'medications', jsonEncode(medications.map((m) => m.toJson()).toList()));
  }

  Future<void> _loadMedications() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString('medications');
    if (data != null) {
      setState(() {
        medications =
            (jsonDecode(data) as List).map((e) => Medication.fromJson(e)).toList();
      });
    }
  }

  void _deleteMedication(int index) {
    final med = medications[index];
    setState(() {
      medications.removeAt(index);
    });
    _saveMedications();
    for (int i = 0; i < (med.duration == 0 ? 1000 : (24 ~/ med.frequency) * med.duration); i++) {
      flutterLocalNotificationsPlugin.cancel(med.name.hashCode + i);
    }
  }

  void _toggleTaken(int index) {
    setState(() {
      medications[index].taken = !medications[index].taken;
    });
    _saveMedications();
  }

  String _nextDoseTime(Medication med) {
    final now = DateTime.now();
    DateTime nextDose = DateTime(
        now.year, now.month, now.day, med.startTime.hour, med.startTime.minute);
    while (nextDose.isBefore(now)) {
      nextDose = nextDose.add(Duration(hours: med.frequency));
    }
    return "${nextDose.hour.toString().padLeft(2, '0')}:${nextDose.minute.toString().padLeft(2, '0')}";
  }

  void _showMedicationDialog({Medication? med, int? index}) {
    final nameController = TextEditingController(text: med?.name ?? '');
    final dosageController = TextEditingController(text: med?.dosage ?? '');
    final frequencyController = TextEditingController(text: med?.frequency.toString());
    final durationController = TextEditingController(text: med?.duration.toString());
    DateTime selectedStartTime = med?.startTime ?? DateTime.now();
    bool indefinite = med?.duration == 0;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(builder: (context, setStateDialog) {
        return AlertDialog(
          title: Text(med == null ? 'Novo medicamento' : 'Editar medicamento'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Nome')),
                TextField(controller: dosageController, decoration: const InputDecoration(labelText: 'Dosagem')),
                TextField(controller: frequencyController, decoration: const InputDecoration(labelText: 'Frequência (h)'), keyboardType: TextInputType.number),
                if (!indefinite)
                  TextField(controller: durationController, decoration: const InputDecoration(labelText: 'Duração (dias)'), keyboardType: TextInputType.number),
                Row(
                  children: [
                    Checkbox(
                      value: indefinite,
                      onChanged: (val) {
                        setStateDialog(() {
                          indefinite = val ?? false;
                          durationController.text = indefinite ? '0' : '1';
                        });
                      },
                    ),
                    const Text('Tratamento por tempo indefinido'),
                    const SizedBox(width: 8),
                    Tooltip(
                      message: 'Marque caso seu tratamento não tenha prazo para terminar',
                      child: const Icon(Icons.info_outline, size: 18),
                    ),
                  ],
                ),
                Row(
                  children: [
                    const Text('Horário inicial:'),
                    TextButton(
                      onPressed: () async {
                        final time = await showTimePicker(
                          context: context,
                          initialTime: TimeOfDay.fromDateTime(selectedStartTime),
                        );
                        if (time != null) {
                          setStateDialog(() {
                            final now = DateTime.now();
                            selectedStartTime = DateTime(now.year, now.month, now.day, time.hour, time.minute);
                          });
                        }
                      },
                      child: Text(
                        '${selectedStartTime.hour.toString().padLeft(2, '0')}:${selectedStartTime.minute.toString().padLeft(2, '0')}',
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            if (med != null)
              TextButton(
                style: TextButton.styleFrom(foregroundColor: Colors.red),
                onPressed: () async {
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: const Text('Confirmar exclusão'),
                      content: const Text('Deseja realmente excluir este medicamento?'),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
                        TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Excluir')),
                      ],
                    ),
                  );
                  if (confirm == true && index != null) {
                    Navigator.pop(context);
                    _deleteMedication(index);
                  }
                },
                child: const Text('Excluir'),
              ),
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
            ElevatedButton(
              onPressed: () {
                final nome = nameController.text.trim();
                final dosagem = dosageController.text.trim();
                final freq = int.tryParse(frequencyController.text) ?? 1;
                final dur = int.tryParse(durationController.text) ?? 1;
                if (nome.isEmpty || dosagem.isEmpty || freq <= 0 || dur < 0) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Preencha todos os campos corretamente')));
                  return;
                }

                final newMed = Medication(
                  name: nome,
                  dosage: dosagem,
                  frequency: freq,
                  duration: dur,
                  startTime: selectedStartTime,
                  taken: med?.taken ?? false,
                );

                setState(() {
                  if (med != null && index != null) {
                    medications[index] = newMed;
                    for (int i = 0; i < (med.duration == 0 ? 1000 : (24 ~/ med.frequency) * med.duration); i++) {
                      flutterLocalNotificationsPlugin.cancel(med.name.hashCode + i);
                    }
                  } else {
                    medications.add(newMed);
                  }
                  _saveMedications();
                  _scheduleNotification(newMed);
                });

                Navigator.pop(context);
              },
              child: const Text('Salvar'),
            ),
          ],
        );
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        centerTitle: true,
        title: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(Icons.medication, size: 22),
            SizedBox(width: 8),
            Text(
              'Medicações/Dosagem',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1.0),
          child: Divider(height: 1, thickness: 1),
        ),
      ),
      body: ListView.separated(
        itemCount: medications.length,
        separatorBuilder: (context, index) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final med = medications[index];
          return ListTile(
            title: Text('${med.name} (${med.dosage})'),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Próxima dose: ${_nextDoseTime(med)}'),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    icon: Icon(
                      med.taken ? Icons.check_circle : Icons.radio_button_unchecked,
                      color: med.taken ? Colors.green : null,
                    ),
                    label: Text(med.taken ? 'Tomado' : 'Marcar como tomado'),
                    onPressed: () => _toggleTaken(index),
                  ),
                ),
              ],
            ),
            trailing: IconButton(
              icon: const Icon(Icons.edit),
              onPressed: () => _showMedicationDialog(med: med, index: index),
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showMedicationDialog(),
        child: const Icon(Icons.add),
      ),
    );
  }
}
