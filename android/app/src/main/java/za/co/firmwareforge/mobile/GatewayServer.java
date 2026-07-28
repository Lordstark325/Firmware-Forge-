package za.co.firmwareforge.mobile;

import android.content.Context;
import android.hardware.usb.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.*;

final class GatewayServer {
    interface Listener { void onGatewayChanged(String message); }
    private final UsbManager usb; private final Listener listener;
    private final String token; private volatile boolean running; private ServerSocket apiSocket, bridgeSocket;
    private UsbDeviceConnection usbConnection; private UsbInterface usbInterface; private UsbEndpoint inEndpoint, outEndpoint;

    GatewayServer(Context context, Listener listener) {
        this.usb=(UsbManager)context.getSystemService(Context.USB_SERVICE); this.listener=listener;
        byte[] random=new byte[6];new SecureRandom().nextBytes(random);StringBuilder value=new StringBuilder();for(byte b:random)value.append(String.format(Locale.US,"%02X",b));token=value.toString();
    }
    String token(){return token;} boolean isRunning(){return running;} boolean isBridgeRunning(){return bridgeSocket!=null&&!bridgeSocket.isClosed();}
    synchronized void start() throws IOException { if(running)return;running=true;apiSocket=new ServerSocket();apiSocket.setReuseAddress(true);apiSocket.bind(new InetSocketAddress(8765));new Thread(this::apiLoop,"gateway-api").start();listener.onGatewayChanged("Gateway listening on port 8765"); }
    synchronized void stop(){running=false;close(apiSocket);close(bridgeSocket);if(usbConnection!=null){if(usbInterface!=null)usbConnection.releaseInterface(usbInterface);usbConnection.close();}usbConnection=null;listener.onGatewayChanged("Gateway stopped");}
    private void apiLoop(){while(running){try{handleApi(apiSocket.accept());}catch(IOException e){if(running)listener.onGatewayChanged("Gateway error: "+e.getMessage());}}}
    private void handleApi(Socket socket){try(Socket s=socket){s.setSoTimeout(4000);BufferedReader reader=new BufferedReader(new InputStreamReader(s.getInputStream(),StandardCharsets.US_ASCII));String request=reader.readLine();if(request==null)return;String auth="";for(String line;(line=reader.readLine())!=null&&!line.isEmpty();)if(line.toLowerCase(Locale.US).startsWith("authorization:"))auth=line.substring(line.indexOf(':')+1).trim();if(!auth.equals("Bearer "+token)){respond(s,401,"{\"error\":\"unauthorized\"}");return;}String path=request.split(" ")[1];if(path.equals("/v1/status")){respond(s,200,statusJson());return;}if(path.equals("/v1/bridge/start")&&request.startsWith("POST ")){try{startBridge();respond(s,200,statusJson());}catch(Exception e){respond(s,409,"{\"error\":\""+escape(e.getMessage())+"\"}");}return;}if(path.equals("/v1/bridge/stop")&&request.startsWith("POST ")){stopBridge();respond(s,200,statusJson());return;}respond(s,404,"{\"error\":\"not_found\"}");}catch(Exception ignored){}}
    private String statusJson(){UsbDevice d=findEspCandidate();String device=d==null?"null":"{\"name\":\""+escape(d.getDeviceName())+"\",\"vendorId\":"+d.getVendorId()+",\"productId\":"+d.getProductId()+",\"permission\":"+usb.hasPermission(d)+"}";return "{\"gateway\":true,\"bridge\":"+isBridgeRunning()+",\"bridgePort\":8766,\"device\":"+device+"}";}
    private UsbDevice findEspCandidate(){Set<Integer> vids=new HashSet<>(Arrays.asList(0x10C4,0x1A86,0x0403,0x303A));for(UsbDevice d:usb.getDeviceList().values())if(vids.contains(d.getVendorId()))return d;return null;}
    private synchronized void startBridge() throws IOException {if(isBridgeRunning())return;UsbDevice d=findEspCandidate();if(d==null)throw new IOException("No probable ESP USB adapter connected");if(!usb.hasPermission(d))throw new IOException("Grant USB permission on the phone first");usbConnection=usb.openDevice(d);if(usbConnection==null)throw new IOException("Could not open USB device");for(int i=0;i<d.getInterfaceCount();i++){UsbInterface f=d.getInterface(i);UsbEndpoint input=null,output=null;for(int j=0;j<f.getEndpointCount();j++){UsbEndpoint ep=f.getEndpoint(j);if(ep.getType()==UsbConstants.USB_ENDPOINT_XFER_BULK){if(ep.getDirection()==UsbConstants.USB_DIR_IN)input=ep;else output=ep;}}if(input!=null&&output!=null&&usbConnection.claimInterface(f,true)){usbInterface=f;inEndpoint=input;outEndpoint=output;break;}}if(inEndpoint==null||outEndpoint==null){usbConnection.close();usbConnection=null;throw new IOException("USB serial interface is not supported by the gateway transport");}if(usbInterface.getInterfaceClass()==UsbConstants.USB_CLASS_COMM){usbConnection.controlTransfer(0x21,0x22,3,usbInterface.getId(),null,0,1000);}bridgeSocket=new ServerSocket();bridgeSocket.setReuseAddress(true);bridgeSocket.bind(new InetSocketAddress(8766));new Thread(this::bridgeLoop,"usb-bridge").start();listener.onGatewayChanged("Authenticated USB bridge listening on port 8766");}
    private void bridgeLoop(){while(running&&isBridgeRunning()){try{Socket client=bridgeSocket.accept();new Thread(()->serveBridge(client),"usb-client").start();}catch(IOException ignored){}}}
    private void serveBridge(Socket client){try(Socket s=client){s.setSoTimeout(5000);String supplied=readLine(s.getInputStream());if(!supplied.equals("TOKEN "+token))return;s.setSoTimeout(0);Thread usbToNetwork=new Thread(()->{byte[] buffer=new byte[Math.max(4096,inEndpoint.getMaxPacketSize()*8)];try{while(!s.isClosed()){int n=usbConnection.bulkTransfer(inEndpoint,buffer,buffer.length,250);if(n>0){s.getOutputStream().write(buffer,0,n);s.getOutputStream().flush();}}}catch(Exception ignored){close(s);}},"usb-to-network");usbToNetwork.start();byte[] buffer=new byte[16384];for(int n;(n=s.getInputStream().read(buffer))>0;){int offset=0;while(offset<n){int sent=usbConnection.bulkTransfer(outEndpoint,buffer,offset,n-offset,3000);if(sent<=0)throw new IOException("USB write failed");offset+=sent;}}}catch(Exception ignored){}finally{close(client);}}
    private synchronized void stopBridge(){close(bridgeSocket);bridgeSocket=null;if(usbConnection!=null){if(usbInterface!=null)usbConnection.releaseInterface(usbInterface);usbConnection.close();}usbConnection=null;usbInterface=null;inEndpoint=null;outEndpoint=null;}
    private static String readLine(InputStream in)throws IOException{ByteArrayOutputStream b=new ByteArrayOutputStream();for(int c;(c=in.read())!=-1&&c!='\n';)if(c!='\r'&&b.size()<200)b.write(c);return b.toString("UTF-8");}
    private static void respond(Socket s,int code,String json)throws IOException{byte[] body=json.getBytes(StandardCharsets.UTF_8);String head="HTTP/1.1 "+code+(code==200?" OK":" Error")+"\r\nContent-Type: application/json\r\nContent-Length: "+body.length+"\r\nConnection: close\r\n\r\n";s.getOutputStream().write(head.getBytes(StandardCharsets.US_ASCII));s.getOutputStream().write(body);}
    private static String escape(String value){return value==null?"unknown":value.replace("\\","\\\\").replace("\"","\\\"");}
    private static void close(Closeable c){try{if(c!=null)c.close();}catch(Exception ignored){}}
}
