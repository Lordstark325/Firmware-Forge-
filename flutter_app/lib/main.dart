import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

void main() => runApp(const FirmwareForgeApp());

const bg = Color(0xFF07100E);
const panel = Color(0xFF0E1B17);
const panel2 = Color(0xFF13251F);
const mint = Color(0xFF70EFB0);
const muted = Color(0xFF8AA69A);

class FirmwareForgeApp extends StatelessWidget {
  const FirmwareForgeApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Firmware Forge',
        theme: ThemeData.dark().copyWith(
          scaffoldBackgroundColor: bg,
          colorScheme: const ColorScheme.dark(
              primary: mint, secondary: mint, surface: panel),
          cardTheme: CardTheme(
              color: panel,
              elevation: 0,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                  side: const BorderSide(color: Color(0xFF29443A)))),
          elevatedButtonTheme: ElevatedButtonThemeData(
              style: ElevatedButton.styleFrom(
                  backgroundColor: mint,
                  foregroundColor: bg,
                  minimumSize: const Size(0, 52),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  textStyle: const TextStyle(fontWeight: FontWeight.w800))),
        ),
        home: const ForgeShell(),
      );
}

class ForgeShell extends StatefulWidget {
  const ForgeShell({super.key});
  @override
  State<ForgeShell> createState() => _ForgeShellState();
}

class _ForgeShellState extends State<ForgeShell> {
  int index = 0;
  static final destinations = [
    NavigationDestination(
        icon: Icon(Icons.dashboard_outlined),
        selectedIcon: Icon(Icons.dashboard),
        label: 'Overview'),
    NavigationDestination(
        icon: Icon(Icons.usb_outlined),
        selectedIcon: Icon(Icons.usb),
        label: 'Devices'),
    NavigationDestination(
        icon: Icon(Icons.hub_outlined),
        selectedIcon: Icon(Icons.hub),
        label: 'Gateway'),
    NavigationDestination(
        icon: Icon(Icons.inventory_2_outlined),
        selectedIcon: Icon(Icons.inventory_2),
        label: 'Library'),
  ];
  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, c) {
        final tablet = c.maxWidth >= 760;
        final pages = [
          const OverviewPage(),
          const DevicesPage(),
          const GatewayPage(),
          const LibraryPage()
        ];
        final body = SafeArea(
            child: Column(children: [
          const AppHeader(),
          Expanded(
              child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 220),
                  child:
                      KeyedSubtree(key: ValueKey(index), child: pages[index])))
        ]));
        return Scaffold(
          body: tablet
              ? Row(children: [
                  NavigationRail(
                      backgroundColor: const Color(0xFF091511),
                      selectedIndex: index,
                      onDestinationSelected: (v) => setState(() => index = v),
                      labelType: NavigationRailLabelType.all,
                      leading: const Padding(
                          padding: EdgeInsets.only(bottom: 22),
                          child: BrandMark()),
                      destinations: destinations
                          .map((d) => NavigationRailDestination(
                              icon: d.icon,
                              selectedIcon: d.selectedIcon,
                              label: Text(d.label)))
                          .toList()),
                  const VerticalDivider(width: 1, color: Color(0xFF29443A)),
                  Expanded(child: body)
                ])
              : body,
          bottomNavigationBar: tablet
              ? null
              : NavigationBar(
                  backgroundColor: const Color(0xFF0B1713),
                  selectedIndex: index,
                  onDestinationSelected: (v) => setState(() => index = v),
                  destinations: destinations),
        );
      });
}

class BrandMark extends StatelessWidget {
  const BrandMark({super.key});
  @override
  Widget build(BuildContext context) => Container(
      width: 48,
      height: 48,
      alignment: Alignment.center,
      decoration:
          BoxDecoration(color: mint, borderRadius: BorderRadius.circular(14)),
      child: const Text('FF',
          style:
              TextStyle(color: bg, fontWeight: FontWeight.w900, fontSize: 17)));
}

class AppHeader extends StatelessWidget {
  const AppHeader({super.key});
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 8),
      child: Row(children: [
        const BrandMark(),
        const SizedBox(width: 12),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Firmware Forge',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w800)),
          const Text('MOBILE DEVICE WORKBENCH',
              style: TextStyle(color: mint, fontSize: 10, letterSpacing: 1.4))
        ])),
        Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
                color: panel2, borderRadius: BorderRadius.circular(30)),
            child: Row(children: const [
              Icon(Icons.shield_outlined, size: 15, color: mint),
              SizedBox(width: 5),
              Text('LOCAL',
                  style: TextStyle(
                      fontSize: 10, color: mint, fontWeight: FontWeight.bold))
            ]))
      ]));
}

class PageFrame extends StatelessWidget {
  final String eyebrow, title, subtitle;
  final List<Widget> children;
  const PageFrame(
      {super.key,
      required this.eyebrow,
      required this.title,
      required this.subtitle,
      required this.children});
  @override
  Widget build(BuildContext context) => Center(
      child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1120),
          child: CustomScrollView(slivers: [
            SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 22, 20, 8),
                sliver: SliverToBoxAdapter(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text(eyebrow,
                          style: const TextStyle(
                              color: mint,
                              fontSize: 11,
                              letterSpacing: 1.8,
                              fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Text(title,
                          style: TextStyle(
                              fontSize: MediaQuery.of(context).size.width < 500
                                  ? 30
                                  : 40,
                              fontWeight: FontWeight.w800,
                              height: 1.05)),
                      const SizedBox(height: 8),
                      Text(subtitle,
                          style: const TextStyle(
                              color: muted, fontSize: 15, height: 1.4))
                    ]))),
            SliverPadding(
                padding: const EdgeInsets.fromLTRB(14, 8, 14, 28),
                sliver: SliverList(delegate: SliverChildListDelegate(children)))
          ])));
}

class ResponsiveGrid extends StatelessWidget {
  final List<Widget> children;
  const ResponsiveGrid({super.key, required this.children});
  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, c) {
        final count = c.maxWidth >= 900
            ? 3
            : c.maxWidth >= 560
                ? 2
                : 1;
        return GridView.count(
            crossAxisCount: count,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: count == 1 ? 1.65 : 1.15,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            children: children);
      });
}

class ForgeCard extends StatelessWidget {
  final IconData icon;
  final String title, body;
  final Widget? action;
  const ForgeCard(
      {super.key,
      required this.icon,
      required this.title,
      required this.body,
      this.action});
  @override
  Widget build(BuildContext context) => Card(
      child: Padding(
          padding: const EdgeInsets.all(18),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                    color: const Color(0xFF18362A),
                    borderRadius: BorderRadius.circular(11)),
                child: Icon(icon, color: mint)),
            const Spacer(),
            Text(title,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Text(body,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: muted, height: 1.35)),
            if (action != null) ...[
              const SizedBox(height: 14),
              SizedBox(width: double.infinity, child: action!)
            ]
          ])));
}

class OverviewPage extends StatelessWidget {
  const OverviewPage({super.key});
  @override
  Widget build(BuildContext context) => PageFrame(
          eyebrow: 'USB + REMOTE OPERATIONS',
          title: 'Your device lab, anywhere.',
          subtitle:
              'Inspect hardware locally or turn this phone into an authenticated gateway for Firmware Forge Desktop.',
          children: [
            ResponsiveGrid(children: [
              const ForgeCard(
                  icon: Icons.usb,
                  title: 'USB discovery',
                  body:
                      'Classify ESP serial adapters, routers, storage, and unknown USB hardware.'),
              const ForgeCard(
                  icon: Icons.lock_outline,
                  title: 'Secure pairing',
                  body:
                      'Use a temporary token to authorize every desktop gateway session.'),
              const ForgeCard(
                  icon: Icons.description_outlined,
                  title: 'Assessment reports',
                  body:
                      'Export recovery images and Device Assessment PDFs from the desktop Firmware Library.')
            ]),
            const SizedBox(height: 12),
            const SafetyNotice()
          ]);
}

class DevicesPage extends StatefulWidget {
  const DevicesPage({super.key});
  @override
  State<DevicesPage> createState() => _DevicesPageState();
}

class _DevicesPageState extends State<DevicesPage> {
  static const channel = MethodChannel('firmware_forge/device');
  List<dynamic> devices = [];
  bool busy = false;
  String? error;
  Future<void> scan() async {
    setState(() => busy = true);
    try {
      devices = await channel.invokeMethod('scanUsb') ?? [];
      error = null;
    } catch (e) {
      error = '$e';
    }
    if (mounted) setState(() => busy = false);
  }

  @override
  void initState() {
    super.initState();
    scan();
  }

  @override
  Widget build(BuildContext context) => PageFrame(
          eyebrow: 'USB-OTG DISCOVERY',
          title: 'Connected hardware',
          subtitle:
              'Connect a data-capable USB-C OTG cable. Unknown devices remain read-only.',
          children: [
            SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                    onPressed: busy ? null : scan,
                    icon: busy
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.refresh),
                    label:
                        Text(busy ? 'Scanning...' : 'Scan connected devices'))),
            if (error != null)
              Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(error!,
                      style: const TextStyle(color: Colors.redAccent))),
            const SizedBox(height: 12),
            if (devices.isEmpty)
              const EmptyState(
                  icon: Icons.usb_off,
                  title: 'No USB devices detected',
                  body:
                      'Attach the ESP32 through an OTG adapter, approve USB access, then scan again.'),
            ...devices.map((d) => Card(
                child: ListTile(
                    contentPadding: const EdgeInsets.all(16),
                    leading: const CircleAvatar(
                        backgroundColor: Color(0xFF18362A),
                        child: Icon(Icons.memory, color: mint)),
                    title: Text(d['kind'] ?? 'USB device',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text(
                        'VID:${d['vendor']}  PID:${d['product']}\n${d['interfaces']} interface(s)',
                        style: const TextStyle(color: muted)),
                    trailing: Icon(
                        d['permission'] == true
                            ? Icons.verified
                            : Icons.lock_outline,
                        color: d['permission'] == true ? mint : Colors.amber))))
          ]);
}

class GatewayPage extends StatefulWidget {
  const GatewayPage({super.key});
  @override
  State<GatewayPage> createState() => _GatewayPageState();
}

class _GatewayPageState extends State<GatewayPage> {
  static const channel = MethodChannel('firmware_forge/device');
  Map<dynamic, dynamic> info = {};
  bool busy = false;
  Future<void> refresh() async {
    try {
      info = await channel.invokeMethod('gatewayStatus') ?? {};
    } catch (e) {
      info = {'error': '$e'};
    }
    if (mounted) setState(() {});
  }

  Future<void> toggle() async {
    setState(() => busy = true);
    try {
      info = await channel.invokeMethod('toggleGateway') ?? {};
    } catch (e) {
      info = {'error': '$e'};
    }
    if (mounted) setState(() => busy = false);
  }

  @override
  void initState() {
    super.initState();
    refresh();
  }

  @override
  Widget build(BuildContext context) {
    final running = info['running'] == true;
    return PageFrame(
        eyebrow: 'AUTHENTICATED PHONE BRIDGE',
        title: 'Desktop gateway',
        subtitle:
            'The desktop can inspect, back up, and update an ESP32 attached to this phone.',
        children: [
          Card(
              child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        StatusPill(
                            active: running,
                            label:
                                running ? 'GATEWAY ONLINE' : 'GATEWAY STOPPED'),
                        const SizedBox(height: 18),
                        InfoRow(
                            label: 'Phone IP',
                            value:
                                '${info['ip'] ?? 'Connect to Wi-Fi or Tailscale'}'),
                        InfoRow(
                            label: 'Control port',
                            value: '${info['port'] ?? 8765}'),
                        InfoRow(
                            label: 'Pairing token',
                            value: '${info['token'] ?? 'Unavailable'}',
                            mono: true),
                        const SizedBox(height: 18),
                        SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                                onPressed: busy ? null : toggle,
                                icon: Icon(running
                                    ? Icons.stop_circle_outlined
                                    : Icons.play_circle_outline),
                                label: Text(running
                                    ? 'Stop secure gateway'
                                    : 'Start secure gateway')))
                      ]))),
          const SizedBox(height: 12),
          const SafetyNotice()
        ]);
  }
}

class LibraryPage extends StatelessWidget {
  const LibraryPage({super.key});
  @override
  Widget build(BuildContext context) => PageFrame(
          eyebrow: 'BACKUPS + REPORTS',
          title: 'Firmware library',
          subtitle:
              'Gateway backups are catalogued privately by Firmware Forge Desktop 0.6 or newer.',
          children: [
            ResponsiveGrid(children: [
              const ForgeCard(
                  icon: Icons.memory,
                  title: 'Recovery images',
                  body:
                      'Keep the original BIN unchanged and export verified copies from the desktop.'),
              const ForgeCard(
                  icon: Icons.picture_as_pdf_outlined,
                  title: 'Assessment PDF',
                  body:
                      'Download detected facts, checksums, gateway capability, and missing hardware details.'),
              const ForgeCard(
                  icon: Icons.fact_check_outlined,
                  title: 'Local verification',
                  body:
                      'Use the desktop library to verify SHA-256 before restoring or flashing firmware.')
            ]),
            const SizedBox(height: 12),
            const SafetyNotice()
          ]);
}

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title, body;
  const EmptyState(
      {super.key, required this.icon, required this.title, required this.body});
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
          color: panel,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFF29443A))),
      child: Column(children: [
        Icon(icon, size: 42, color: muted),
        const SizedBox(height: 12),
        Text(title,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 6),
        Text(body,
            textAlign: TextAlign.center,
            style: const TextStyle(color: muted, height: 1.4))
      ]));
}

class StatusPill extends StatelessWidget {
  final bool active;
  final String label;
  const StatusPill({super.key, required this.active, required this.label});
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
      decoration: BoxDecoration(
          color: active ? const Color(0xFF173D2D) : const Color(0xFF34271B),
          borderRadius: BorderRadius.circular(20)),
      child: Text(label,
          style: TextStyle(
              color: active ? mint : Colors.amber,
              fontSize: 10,
              fontWeight: FontWeight.bold,
              letterSpacing: 1)));
}

class InfoRow extends StatelessWidget {
  final String label, value;
  final bool mono;
  const InfoRow(
      {super.key, required this.label, required this.value, this.mono = false});
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(
            width: 120,
            child: Text(label, style: const TextStyle(color: muted))),
        Expanded(
            child: SelectableText(value,
                style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontFamily: mono ? 'monospace' : null)))
      ]));
}

class SafetyNotice extends StatelessWidget {
  const SafetyNotice({super.key});
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: const Color(0xFF302719),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF5C4926))),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: const [
        Icon(Icons.warning_amber_rounded, color: Colors.amber),
        SizedBox(width: 12),
        Expanded(
            child: Text(
                'Safety boundary: firmware writes require the exact board image and recovery plan. The app does not bypass bootloader locks, Verified Boot, FRP, vendor signatures, or device security.',
                style: TextStyle(color: Color(0xFFE7C87E), height: 1.4)))
      ]));
}
