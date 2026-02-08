use ringbuf::{
    traits::Split,
    HeapRb,
};

pub struct AudioRingBuffer {
    producer: ringbuf::HeapProd<f32>,
    consumer: ringbuf::HeapCons<f32>,
}

impl AudioRingBuffer {
    pub fn new(capacity: usize) -> Self {
        let rb = HeapRb::<f32>::new(capacity);
        let (producer, consumer) = rb.split();
        Self { producer, consumer }
    }

    pub fn split(self) -> (ringbuf::HeapProd<f32>, ringbuf::HeapCons<f32>) {
        (self.producer, self.consumer)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ringbuf::traits::{Consumer, Producer};

    #[test]
    fn test_round_trip() {
        let buf = AudioRingBuffer::new(1024);
        let (mut prod, mut cons) = buf.split();

        let data: Vec<f32> = (0..512).map(|i| i as f32 / 512.0).collect();
        let written = prod.push_slice(&data);
        assert_eq!(written, 512);

        let mut output = vec![0.0f32; 512];
        let read = cons.pop_slice(&mut output);
        assert_eq!(read, 512);
        assert_eq!(data, output);
    }

    #[test]
    fn test_overflow_no_panic() {
        let buf = AudioRingBuffer::new(64);
        let (mut prod, mut _cons) = buf.split();

        let data = vec![1.0f32; 128];
        let written = prod.push_slice(&data);
        // Should only write up to capacity, no panic
        assert!(written <= 64);
    }
}
