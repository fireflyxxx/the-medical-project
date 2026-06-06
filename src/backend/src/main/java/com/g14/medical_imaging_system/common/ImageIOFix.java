package com.g14.medical_imaging_system.common;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import javax.imageio.spi.IIORegistry;
import javax.imageio.spi.ImageReaderSpi;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/**
 * 修复 dcm4che-imageio 注册的 jpeg-cv 格式没有对应解码器的问题。
 */
@Component
public class ImageIOFix {

    @PostConstruct
    public void fixJpegCv() {
        IIORegistry registry = IIORegistry.getDefaultInstance();

        // 找到标准 JPEG reader (非 dcm4che)
        ImageReaderSpi jpegSpi = null;
        Iterator<ImageReaderSpi> spis = registry.getServiceProviders(ImageReaderSpi.class, true);
        while (spis.hasNext()) {
            ImageReaderSpi spi = spis.next();
            String cn = spi.getPluginClassName();
            if (cn != null && cn.contains("dcm4che")) continue;
            for (String name : spi.getFormatNames()) {
                if ("JPEG".equalsIgnoreCase(name) || "jpg".equalsIgnoreCase(name)) {
                    jpegSpi = spi;
                    break;
                }
            }
            if (jpegSpi != null) break;
        }

        // 移除 dcm4che 的坏 JPEG reader
        List<ImageReaderSpi> toRemove = new ArrayList<>();
        Iterator<ImageReaderSpi> it = registry.getServiceProviders(ImageReaderSpi.class, false);
        while (it.hasNext()) {
            ImageReaderSpi spi = it.next();
            String cn = spi.getPluginClassName();
            if (cn != null && cn.contains("dcm4che")) {
                for (String name : spi.getFormatNames()) {
                    if ("jpeg-cv".equalsIgnoreCase(name) || "jpeg".equalsIgnoreCase(name)) {
                        toRemove.add(spi);
                        break;
                    }
                }
            }
        }
        for (ImageReaderSpi spi : toRemove) {
            registry.deregisterServiceProvider(spi);
        }

        // 注册包装 SPI
        if (jpegSpi != null) {
            registry.registerServiceProvider(new JpegCvReaderSpi(jpegSpi));
        }
    }

    /** 把 jpeg-cv 格式代理到标准 JPEG reader */
    private static class JpegCvReaderSpi extends ImageReaderSpi {
        private final ImageReaderSpi delegate;

        JpegCvReaderSpi(ImageReaderSpi d) {
            this.delegate = d;
        }

        @Override public String getDescription(java.util.Locale locale) { return "JPEG-cv wrapper"; }
        @Override public String getVendorName() { return delegate.getVendorName(); }
        @Override public String getVersion() { return delegate.getVersion(); }
        @Override public String[] getFormatNames() { return new String[]{"jpeg-cv"}; }
        @Override public String[] getFileSuffixes() { return delegate.getFileSuffixes(); }
        @Override public String[] getMIMETypes() { return delegate.getMIMETypes(); }
        @Override public String getPluginClassName() { return delegate.getPluginClassName(); }
        @Override public Class<?>[] getInputTypes() { return delegate.getInputTypes(); }
        @Override public String[] getImageWriterSpiNames() { return delegate.getImageWriterSpiNames(); }

        @Override
        public javax.imageio.ImageReader createReaderInstance(Object extension) throws java.io.IOException {
            return delegate.createReaderInstance(extension);
        }

        @Override
        public boolean canDecodeInput(Object source) throws java.io.IOException {
            return delegate.canDecodeInput(source);
        }

        @Override
        public javax.imageio.ImageReader createReaderInstance() throws java.io.IOException {
            return delegate.createReaderInstance();
        }
    }
}
