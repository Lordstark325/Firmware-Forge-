package za.co.firmwareforge.mobile;

import android.content.Context;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.os.Bundle;
import java.net.Inet4Address;
import java.net.NetworkInterface;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Arrays;
import io.flutter.embedding.android.FlutterActivity;
import io.flutter.embedding.engine.FlutterEngine;
import io.flutter.plugin.common.MethodChannel;

public class MainActivity extends FlutterActivity implements GatewayServer.Listener {
    private static final String CHANNEL = "firmware_forge/device";
    private UsbManager usb;
    private GatewayServer gateway;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        usb = (UsbManager)getSystemService(Context.USB_SERVICE);
        gateway = new GatewayServer(this, this);
    }

    @Override public void configureFlutterEngine(FlutterEngine engine) {
        super.configureFlutterEngine(engine);
        new MethodChannel(engine.getDartExecutor().getBinaryMessenger(), CHANNEL).setMethodCallHandler((call, result) -> {
            try {
                switch (call.method) {
                    case "scanUsb": result.success(scanUsb()); break;
                    case "gatewayStatus": result.success(gatewayStatus()); break;
                    case "toggleGateway": if (gateway.isRunning()) gateway.stop(); else gateway.start(); result.success(gatewayStatus()); break;
                    default: result.notImplemented();
                }
            } catch (Exception e) { result.error("DEVICE_ERROR", e.getMessage(), null); }
        });
    }

    private List<Map<String,Object>> scanUsb() {
        List<Map<String,Object>> found = new ArrayList<>();
        for (UsbDevice device : usb.getDeviceList().values()) {
            Map<String,Object> item = new HashMap<>();
            item.put("vendor", String.format("%04X", device.getVendorId()));
            item.put("product", String.format("%04X", device.getProductId()));
            item.put("interfaces", device.getInterfaceCount());
            item.put("permission", usb.hasPermission(device));
            Map<String,String> classification = classifyBoard(device);
            item.put("kind", classification.get("family"));
            item.put("confidence", classification.get("confidence"));
            item.put("category", classification.get("category"));
            found.add(item);
        }
        return found;
    }

    private Map<String,String> classifyBoard(UsbDevice device) {
        Map<String,String> result = new HashMap<>();
        int vid=device.getVendorId(), pid=device.getProductId();
        String product=(device.getProductName()==null?"":device.getProductName())+" "+(device.getManufacturerName()==null?"":device.getManufacturerName());
        String family=null, category="board", confidence="vendor match";
        if (vid==0x303A || product.matches("(?i).*(espressif|esp32|esp8266).*$")) family="Espressif ESP32 / ESP8266";
        else if (vid==0x2E8A || product.matches("(?i).*(raspberry pi pico|rp2040|rp2350).*$")) family="Raspberry Pi RP2040 / RP2350";
        else if (vid==0x2341 || vid==0x2A03 || product.matches("(?i).*arduino.*")) family="Arduino board";
        else if (vid==0x0483 || product.matches("(?i).*(stm32|stmicro).*$")) family=pid==0xDF11?"STM32 DFU bootloader":"STM32 development board";
        else if (vid==0x16C0 || product.matches("(?i).*teensy.*")) family="PJRC Teensy";
        else if (vid==0x1915 || product.matches("(?i).*(nordic|nrf52|nrf53).*$")) family="Nordic nRF development board";
        else if (vid==0x239A || product.matches("(?i).*adafruit.*")) family="Adafruit development board";
        else if (vid==0x04D8 || product.matches("(?i).*microchip.*")) family="Microchip development board";
        else if (vid==0x1A86) { family="WCH CH340 / CH341 serial adapter"; category="adapter"; confidence="adapter only - board unknown"; }
        else if (vid==0x10C4) { family="Silicon Labs CP210x serial adapter"; category="adapter"; confidence="adapter only - board unknown"; }
        else if (vid==0x0403) { family="FTDI USB serial adapter"; category="adapter"; confidence="adapter only - board unknown"; }
        if (family==null) {
            family=classifyInterface(device); category="unknown"; confidence="USB class only";
        }
        result.put("family",family); result.put("category",category); result.put("confidence",confidence); return result;
    }

    private String classifyInterface(UsbDevice device) {
        for (int i=0; i<device.getInterfaceCount(); i++) {
            UsbInterface face=device.getInterface(i);
            if (face.getInterfaceClass()==2) return "USB modem or router candidate";
            if (face.getInterfaceClass()==8) return "USB storage device";
        }
        return "Unknown USB device - read only";
    }

    private Map<String,Object> gatewayStatus() {
        Map<String,Object> status = new HashMap<>();
        status.put("running", gateway.isRunning()); status.put("ip", localIp()); status.put("port", 8765); status.put("token", gateway.token());
        return status;
    }

    private String localIp() {
        try { for (NetworkInterface n:Collections.list(NetworkInterface.getNetworkInterfaces())) for(java.net.InetAddress a:Collections.list(n.getInetAddresses())) if(!a.isLoopbackAddress() && a instanceof Inet4Address) return a.getHostAddress(); } catch(Exception ignored) {}
        return "Connect to Wi-Fi or Tailscale";
    }

    @Override public void onGatewayChanged(String message) {}
    @Override protected void onDestroy() { if (gateway != null) gateway.stop(); super.onDestroy(); }
}
