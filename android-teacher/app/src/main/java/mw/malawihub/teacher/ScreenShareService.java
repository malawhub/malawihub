package mw.malawihub.teacher;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.media.projection.MediaProjection;
import android.os.IBinder;
import android.os.Build;
import androidx.annotation.Nullable;

public class ScreenShareService extends Service {
    private static final String CHANNEL_ID="malawihub_screen_share";
    private MediaProjection projection;
    @Override public void onCreate(){
        super.onCreate();
        if(Build.VERSION.SDK_INT>=26){
            NotificationChannel c=new NotificationChannel(CHANNEL_ID,"MalawiHub Screen Sharing",NotificationManager.IMPORTANCE_LOW);
            getSystemService(NotificationManager.class).createNotificationChannel(c);
        }
    }
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(Build.VERSION.SDK_INT>=29){
            startForeground(4101,notification(),android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
        }else startForeground(4101,notification());
        int result=intent.getIntExtra("resultCode",-1);
        Intent data=intent.getParcelableExtra("data");
        if(result==android.app.Activity.RESULT_OK && data!=null){
            android.media.projection.MediaProjectionManager m=(android.media.projection.MediaProjectionManager)getSystemService(MEDIA_PROJECTION_SERVICE);
            projection=m.getMediaProjection(result,data);
            if(projection!=null) projection.registerCallback(new MediaProjection.Callback(){@Override public void onStop(){stopSelf();}},null);
        }
        return START_NOT_STICKY;
    }
    private Notification notification(){
        if(Build.VERSION.SDK_INT>=26)return new Notification.Builder(this,CHANNEL_ID).setContentTitle("MalawiHub").setContentText("Screen sharing is active").setSmallIcon(android.R.drawable.ic_menu_view).setOngoing(true).build();
        return new Notification.Builder(this).setContentTitle("MalawiHub").setContentText("Screen sharing is active").setSmallIcon(android.R.drawable.ic_menu_view).setOngoing(true).build();
    }
    @Override public void onDestroy(){if(projection!=null){projection.stop();projection=null;}super.onDestroy();}
    @Nullable @Override public IBinder onBind(Intent intent){return null;}
}
