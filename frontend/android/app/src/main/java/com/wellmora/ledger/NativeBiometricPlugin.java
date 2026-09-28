package com.wellmora.ledger;

import android.content.DialogInterface;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.CancellationSignal;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeBiometric")
public class NativeBiometricPlugin extends Plugin {

    private CancellationSignal cancellationSignal;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                BiometricManager bm = getContext().getSystemService(BiometricManager.class);
                if (bm != null) {
                    int canAuth = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK);
                    if (canAuth == BiometricManager.BIOMETRIC_SUCCESS) {
                        ret.put("isAvailable", true);
                        ret.put("hasEnrolledBiometrics", true);
                        call.resolve(ret);
                        return;
                    } else if (canAuth == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED) {
                        ret.put("isAvailable", true);
                        ret.put("hasEnrolledBiometrics", false);
                        call.resolve(ret);
                        return;
                    }
                }
            } catch (Exception ignored) {}
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            ret.put("isAvailable", true);
            ret.put("hasEnrolledBiometrics", true);
            call.resolve(ret);
            return;
        }

        ret.put("isAvailable", false);
        ret.put("hasEnrolledBiometrics", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void verifyIdentity(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", "Biometrics require Android 9.0 or higher.");
            call.resolve(ret);
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                if (cancellationSignal != null) {
                    cancellationSignal.cancel();
                }
                cancellationSignal = new CancellationSignal();

                String title = call.getString("title", "Wellmora Enterprise");
                String subtitle = call.getString("subtitle", "Touch the fingerprint sensor to unlock");
                String negativeButtonText = call.getString("negativeButtonText", "Cancel");

                BiometricPrompt.Builder builder = new BiometricPrompt.Builder(getContext())
                        .setTitle(title)
                        .setSubtitle(subtitle)
                        .setNegativeButton(negativeButtonText, getActivity().getMainExecutor(), (dialog, which) -> {
                            JSObject ret = new JSObject();
                            ret.put("success", false);
                            ret.put("error", "Cancelled by user");
                            call.resolve(ret);
                        });

                BiometricPrompt prompt = builder.build();

                prompt.authenticate(cancellationSignal, getActivity().getMainExecutor(), new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationError(int errorCode, CharSequence errString) {
                        super.onAuthenticationError(errorCode, errString);
                        JSObject ret = new JSObject();
                        ret.put("success", false);
                        ret.put("error", errString.toString());
                        ret.put("errorCode", errorCode);
                        call.resolve(ret);
                    }

                    @Override
                    public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                        super.onAuthenticationSucceeded(result);
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        call.resolve(ret);
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        super.onAuthenticationFailed();
                    }
                });
            } catch (Exception e) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", e.getMessage());
                call.resolve(ret);
            }
        });
    }
}
