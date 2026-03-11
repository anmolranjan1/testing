
package com.compliance.main.data;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "employee_type")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "emp_type_id")
    private Integer empTypeId;

    @Column(name = "emp_type_name", nullable = false)
    private String empTypeName;

}