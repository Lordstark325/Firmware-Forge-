package za.co.firmwareforge.mobile;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.hardware.usb.*;
import android.net.Uri;
import android.os.*;
import android.provider.OpenableColumns;
import android.view.*;
import android.widget.*;
import java.io.*;
import java.security.MessageDigest;
import java.util.*;

public class MainActivity extends Activity implements GatewayServer.Listener {
    private static final String USB_PERMISSION = "za.co.firmwareforge.mobile.USB_PERMISSION";
    private UsbManager usb; private LinearLayout deviceList; private TextView status, firmwareInfo;
    private GatewayServer gateway; private TextView gatewayInfo; private Button gatewayButton;
    private final Set<Integer> espVendors = new HashSet<>(Arrays.asList(0x10C4, 0x1A86, 0x0403, 0x303A));

    @Override public void onCreate(Bundle state) {
        super.onCreate(state); usb = (UsbManager)getSystemService(USB_SERVICE); gateway=new GatewayServer(this,this); buildUi(); scan();
        IntentFilter filter = new IntentFilter(); filter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED); filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED); filter.addAction(USB_PERMISSION);
        registerReceiver(receiver, filter, Build.VERSION.SDK_INT >= 33 ? Context.RECEIVER_NOT_EXPORTED : 0);
    }
    @Override protected void onDestroy() { gateway.stop(); super.onDestroy(); unregisterReceiver(receiver); }

    private TextView text(String value, int size, int color) { TextView v=new TextView(this); v.setText(value); v.setTextSize(size); v.setTextColor(color); v.setPadding(0,8,0,8); return v; }
    private Button button(String label) { Button b=new Button(this); b.setText(label); b.setTextColor(Color.rgb(5,35,25)); b.setBackgroundColor(Color.rgb(112,239,176)); b.setAllCaps(false); return b; }
    private void buildUi() {
        ScrollView scroll=new ScrollView(this); LinearLayout root=new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setPadding(42,46,42,60); root.setBackgroundColor(Color.rgb(7,16,14)); scroll.addView(root);
        TextView brand=text("FF  FIRMWARE FORGE",14,Color.rgb(105,238,171)); brand.setLetterSpacing(.12f); root.addView(brand);
        root.addView(text("Mobile device lab",30,Color.WHITE)); root.addView(text("Private USB-OTG companion",14,Color.rgb(130,157,146)));
        status=text("Watching for connected hardware...",13,Color.rgb(105,238,171)); root.addView(status);
        Button scan=button("Scan connected devices"); scan.setOnClickListener(v->scan()); root.addView(scan, params(-1,56,18));
        root.addView(text("DESKTOP GATEWAY",11,Color.rgb(112,143,130))); gatewayInfo=text(gatewayText("Gateway stopped"),13,Color.rgb(190,214,204));root.addView(gatewayInfo);
        gatewayButton=button("Start secure gateway");gatewayButton.setOnClickListener(v->{try{if(gateway.isRunning())gateway.stop();else gateway.start();gatewayButton.setText(gateway.isRunning()?"Stop secure gateway":"Start secure gateway");gatewayInfo.setText(gatewayText(gateway.isRunning()?"Ready for desktop pairing":"Gateway stopped"));}catch(Exception e){gatewayInfo.setText("Could not start gateway: "+e.getMessage());}});root.addView(gatewayButton,params(-1,56,10));
        root.addView(text("CONNECTED HARDWARE",11,Color.rgb(112,143,130))); deviceList=new LinearLayout(this); deviceList.setOrientation(LinearLayout.VERTICAL); root.addView(deviceList);
        root.addView(text("FIRMWARE LIBRARY",11,Color.rgb(112,143,130))); firmwareInfo=text("Desktop gateway backups are catalogued automatically in the desktop Firmware Library. You can also select a local image here to verify its checksum before use.",13,Color.rgb(190,214,204)); root.addView(firmwareInfo);
        Button choose=button("Verify local firmware file"); choose.setOnClickListener(v->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.setType("application/octet-stream");i.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(i,7);}); root.addView(choose, params(-1,56,12));
        TextView warning=text("Safety lock: this APK identifies USB hardware and verifies firmware files. Flash writing is disabled until the ESP32 Android transport is validated on real OTG hardware. Routers require model-specific network adapters.",12,Color.rgb(232,194,112)); warning.setBackgroundColor(Color.rgb(45,36,21)); warning.setPadding(20,18,20,18); root.addView(warning, params(-1,-2,18));
        root.addView(text("The app does not bypass Android bootloader locks, Verified Boot, FRP, vendor signatures or device security.",11,Color.rgb(104,128,118)));
        setContentView(scroll);
    }
    private LinearLayout.LayoutParams params(int w,int h,int top){LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(w,h);p.setMargins(0,top,0,top);return p;}
    private void scan() {
        deviceList.removeAllViews(); Collection<UsbDevice> devices=usb.getDeviceList().values(); status.setText(devices.size()+" USB device(s) detected");
        if(devices.isEmpty()){deviceList.addView(text("Connect an ESP32 using a USB-C OTG/data cable.",13,Color.rgb(105,125,117)));return;}
        for(UsbDevice d:devices){boolean esp=espVendors.contains(d.getVendorId()); String kind=esp?"Probable ESP32 serial adapter":classify(d); LinearLayout card=new LinearLayout(this);card.setOrientation(LinearLayout.VERTICAL);card.setPadding(20,15,20,15);card.setBackgroundColor(Color.rgb(16,31,26));card.addView(text(kind,15,esp?Color.rgb(105,218,244):Color.WHITE));card.addView(text(String.format(Locale.US,"VID:%04X PID:%04X | %d interface(s)",d.getVendorId(),d.getProductId(),d.getInterfaceCount()),11,Color.rgb(121,151,138)));Button permission=button(usb.hasPermission(d)?"USB permission granted":"Allow USB access");permission.setEnabled(!usb.hasPermission(d));permission.setOnClickListener(v->usb.requestPermission(d,PendingIntent.getBroadcast(this,0,new Intent(USB_PERMISSION).setPackage(getPackageName()),PendingIntent.FLAG_IMMUTABLE)));card.addView(permission,params(-1,50,8));deviceList.addView(card,params(-1,-2,10));}
    }
    private String classify(UsbDevice d){for(int i=0;i<d.getInterfaceCount();i++){int c=d.getInterface(i).getInterfaceClass();if(c==UsbConstants.USB_CLASS_COMM)return "USB modem/router candidate";if(c==UsbConstants.USB_CLASS_MASS_STORAGE)return "USB storage device";}return "Unknown USB device - read only";}
    private String gatewayText(String message){return message+"\nPhone IP: "+localIp()+"\nControl port: 8765\nPairing token: "+gateway.token();}
    private String localIp(){try{for(java.net.NetworkInterface n:java.util.Collections.list(java.net.NetworkInterface.getNetworkInterfaces()))for(java.net.InetAddress a:java.util.Collections.list(n.getInetAddresses()))if(!a.isLoopbackAddress()&&a instanceof java.net.Inet4Address)return a.getHostAddress();}catch(Exception ignored){}return "Connect phone and desktop to the same network";}
    @Override public void onGatewayChanged(String message){runOnUiThread(()->gatewayInfo.setText(gatewayText(message)));}
    private final BroadcastReceiver receiver=new BroadcastReceiver(){@Override public void onReceive(Context c,Intent i){scan();}};
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==7&&result==RESULT_OK&&data!=null){Uri uri=data.getData();getContentResolver().takePersistableUriPermission(uri,Intent.FLAG_GRANT_READ_URI_PERMISSION);new Thread(()->hashFirmware(uri)).start();}}
    private void hashFirmware(Uri uri){try(InputStream in=getContentResolver().openInputStream(uri)){MessageDigest md=MessageDigest.getInstance("SHA-256");byte[] b=new byte[65536];long size=0;for(int n;(n=in.read(b))>0;){md.update(b,0,n);size+=n;}StringBuilder hash=new StringBuilder();for(byte x:md.digest())hash.append(String.format("%02x",x));String name=uri.getLastPathSegment();long finalSize=size;runOnUiThread(()->firmwareInfo.setText(name+"\n"+finalSize+" bytes\nSHA-256: "+hash));}catch(Exception e){runOnUiThread(()->firmwareInfo.setText("Could not read firmware: "+e.getMessage()));}}
}
