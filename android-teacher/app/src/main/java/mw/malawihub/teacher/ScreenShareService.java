package mw.malawihub.teacher;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

public class ScreenShareService extends Service {
    private static final String CHANNEL_ID="malawihub_screen_share";
    @Override public void onCreate(){
        super.onCreate();
        if(Build.VERSION.SDK_INT>=26){
            NotificationChannel c=new NotificationChannel(CHANNEL_ID,"MalawiHub Screen Sharing",NotificationManager.IMPORTANCE_LOW);
            getSystemService(NotificationManager.class).createNotificationChannel(c);
        }
    }
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(Build.VERSION.SDK_INT>=29) startForeground(4101,notification(),android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
        else startForeground(4101,notification());
        return START_NOT_STICKY;
    }
    private Notification notification(){
        if(Build.VERSION.SDK_INT>=26)return new Notification.Builder(this,CHANNEL_ID).setContentTitle("MalawiHub").setContentText("Screen sharing is active").setSmallIcon(android.R.drawable.ic_menu_view).setOngoing(true).build();
        return new Notification.Builder(this).setContentTitle("MalawiHub").setContentText("Screen sharing is active").setSmallIcon(android.R.drawable.ic_menu_view).setOngoing(true).build();
    }
    @Override public IBinder onBind(Intent intent){return null;}
}